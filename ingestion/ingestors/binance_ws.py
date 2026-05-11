import asyncio
import json
import logging
import time

from collections import deque
from typing import AsyncIterator, Optional

from ingestion.models import BackoffConfig

import websockets

from core.circuit_breaker import CircuitBreakerConfig, get_circuit_breaker
from core.redis_bus import get_redis

logger = logging.getLogger("ingestion.ingestors.binance_ws")

BINANCE_WS_URL = "wss://fstream.binance.com/ws"
BUFFER_MAX_SIZE = 500

class ExponentialBackoff:
    def __init__(self, config: BackoffConfig):
        self.config = config
        self.attempt = 0

    def reset(self) -> None:
        self.attempt = 0

    async def wait(self) -> None:
        if self.attempt >= self.config.max_retries:
            raise ConnectionError("Max retries exceeded")
        delay = min(
            self.config.base_delay * (2 ** self.attempt),
            self.config.max_delay
        )
        delay *= (1 + self.config.jitter * (2 * time.time() % 1 - 0.5))
        logger.info(f"Backoff: waiting {delay:.2f}s (attempt {self.attempt + 1}/{self.config.max_retries})")
        await asyncio.sleep(delay)
        self.attempt += 1

    @property
    def exhausted(self) -> bool:
        return self.attempt >= self.config.max_retries


class ResyncBuffer:
    def __init__(self, max_size: int = BUFFER_MAX_SIZE):
        self.max_size = max_size
        self._buffers: dict[str, deque[dict]] = {}
        self._resyncing: set[str] = set()
        self._locks: dict[str, asyncio.Lock] = {}

    def start_resync(self, symbol: str) -> None:
        self._resyncing.add(symbol)
        if symbol not in self._buffers:
            self._buffers[symbol] = deque(maxlen=self.max_size)
        if symbol not in self._locks:
            self._locks[symbol] = asyncio.Lock()

    async def flush(self, symbol: str, final_sequence: int) -> list[dict]:
        async with self._locks[symbol]:
            buffer = self._buffers.get(symbol, deque())
            kept = deque(
                (msg for msg in buffer if msg.get("sequence", 0) > final_sequence),
                maxlen=self.max_size
            )
            self._buffers[symbol] = kept
            self._resyncing.discard(symbol)
            return list(kept)

    def is_resyncing(self, symbol: str) -> bool:
        return symbol in self._resyncing

    async def add(self, symbol: str, message: dict) -> None:
        if symbol not in self._locks:
            self._locks[symbol] = asyncio.Lock()
        async with self._locks[symbol]:
            if symbol not in self._buffers:
                self._buffers[symbol] = deque(maxlen=self.max_size)
            self._buffers[symbol].append(message)

    async def get_buffer(self, symbol: str) -> list[dict]:
        async with self._locks.get(symbol, asyncio.Lock()):
            return list(self._buffers.get(symbol, []))


class BinanceWSIngestor:
    def __init__(
        self,
        symbols: list[str],
        backoff_config: BackoffConfig = BackoffConfig()
    ):
        self.symbols = set(symbols)
        self.backoff_config = backoff_config
        self._circuit_breaker = get_circuit_breaker(
            "binance_ws",
            CircuitBreakerConfig(failure_threshold=3, window_seconds=30, wait_seconds=60)
        )
        self._redis = get_redis()
        self._resync_buffer = ResyncBuffer()
        self._running = False
        self._orderbook_ws: Optional[websockets.WebSocketClientProtocol] = None
        self._trade_ws: Optional[websockets.WebSocketClientProtocol] = None
        self._orderbook_reconnect_event = asyncio.Event()
        self._trade_reconnect_event = asyncio.Event()
        self._orderbook_reconnect_event.set()
        self._trade_reconnect_event.set()
        self._resync_listener_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        self._running = True
        self._resync_listener_task = asyncio.create_task(self._listen_resync_signals())
        asyncio.create_task(self._run_orderbook_streams())
        asyncio.create_task(self._run_trade_streams())
        logger.info("BinanceWSIngestor started")

    async def stop(self) -> None:
        self._running = False
        if self._orderbook_ws:
            await self._orderbook_ws.close()
        if self._trade_ws:
            await self._trade_ws.close()
        if self._resync_listener_task:
            self._resync_listener_task.cancel()
        logger.info("BinanceWSIngestor stopped")

    async def update_symbols(self, symbols: list[str]) -> None:
        old_symbols = self.symbols
        self.symbols = set(symbols)
        added = self.symbols - old_symbols
        removed = old_symbols - self.symbols
        if added or removed:
            logger.info(f"Symbols updated: added={added}, removed={removed}")
            self._orderbook_reconnect_event.set()
            self._trade_reconnect_event.set()

    async def orderbook_stream(self) -> AsyncIterator[dict]:
        while self._running:
            if not self.symbols:
                await asyncio.sleep(1)
                continue
            backoff = ExponentialBackoff(self.backoff_config)
            while self._running and self.symbols:
                try:
                    async for msg in self._connect_orderbook_stream():
                        yield msg
                except Exception as e:
                    logger.error(f"Orderbook stream error: {e}")
                    if not backoff.exhausted:
                        await backoff.wait()
                    else:
                        logger.error("Orderbook stream exhausted retries, waiting 30s")
                        await asyncio.sleep(30)
                        backoff.reset()

    async def trade_stream(self) -> AsyncIterator[dict]:
        while self._running:
            if not self.symbols:
                await asyncio.sleep(1)
                continue
            backoff = ExponentialBackoff(self.backoff_config)
            while self._running and self.symbols:
                try:
                    async for msg in self._connect_trade_stream():
                        yield msg
                except Exception as e:
                    logger.error(f"Trade stream error: {e}")
                    if not backoff.exhausted:
                        await backoff.wait()
                    else:
                        logger.error("Trade stream exhausted retries, waiting 30s")
                        await asyncio.sleep(30)
                        backoff.reset()

    async def _listen_resync_signals(self) -> None:
        try:
            pubsub = self._redis.redis.pubsub()
            await pubsub.subscribe("control:resync")
        except Exception as e:
            logger.warning(f"Could not subscribe to resync signals: {e}")
            return
        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                data = json.loads(message["data"])
                symbol = data.get("symbol")
                if not symbol:
                    continue
                action = data.get("action")
                if action == "start":
                    self._resync_buffer.start_resync(symbol)
                    logger.info(f"Resync started for {symbol}")
                elif action == "complete":
                    sequence = data.get("sequence", 0)
                    flushed = await self._resync_buffer.flush(symbol, sequence)
                    logger.info(f"Resync complete for {symbol}, flushed {len(flushed)} messages")
        except asyncio.CancelledError:
            pass

    async def _run_orderbook_streams(self) -> None:
        logger.info("_run_orderbook_streams started")
        while self._running:
            logger.debug("_run_orderbook_streams: waiting for reconnect event")
            await self._orderbook_reconnect_event.wait()
            self._orderbook_reconnect_event.clear()
            logger.debug(f"_run_orderbook_streams: got event, symbols={self.symbols}")
            if not self.symbols:
                await asyncio.sleep(1)
                continue
            backoff = ExponentialBackoff(self.backoff_config)
            while self._running and self.symbols:
                try:
                    await self._connect_orderbook_stream_simple()
                except Exception as e:
                    logger.error(f"Orderbook stream error: {e}")
                    if not backoff.exhausted:
                        await backoff.wait()
                    else:
                        logger.error("Orderbook stream exhausted retries, waiting 30s")
                        await asyncio.sleep(30)
                        backoff.reset()

    async def _run_trade_streams(self) -> None:
        logger.info("_run_trade_streams started")
        while self._running:
            logger.debug("_run_trade_streams: waiting for reconnect event")
            await self._trade_reconnect_event.wait()
            self._trade_reconnect_event.clear()
            logger.debug(f"_run_trade_streams: got event, symbols={self.symbols}")
            if not self.symbols:
                await asyncio.sleep(1)
                continue
            backoff = ExponentialBackoff(self.backoff_config)
            while self._running and self.symbols:
                try:
                    await self._connect_trade_stream_simple()
                except Exception as e:
                    logger.error(f"Trade stream error: {e}")
                    if not backoff.exhausted:
                        await backoff.wait()
                    else:
                        logger.error("Trade stream exhausted retries, waiting 30s")
                        await asyncio.sleep(30)
                        backoff.reset()

    async def _connect_orderbook_stream_simple(self) -> None:
        streams = [f"{s.lower()}@depth20@100ms" for s in self.symbols]
        url = f"{BINANCE_WS_URL}?streams={'/'.join(streams)}"
        logger.info(f"Connecting to orderbook stream: {url[:80]}...")
        async with websockets.connect(url, ping_timeout=60, ping_interval=25) as ws:
            self._orderbook_ws = ws
            logger.info("Orderbook stream WebSocket connected, waiting for messages...")
            logger.info(f"Symbols subscribed: {self.symbols}")
            try:
                while self._running:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=30)
                    except asyncio.TimeoutError:
                        await ws.ping()
                        continue
                    data = json.loads(msg)
                    stream_name = data.get("stream", "")
                    
                    # Handle different message formats
                    if stream_name:
                        # Wrapped format: {"stream": "btcusdt@depth20@100ms", "data": {...}}
                        symbol = stream_name.split("@")[0].upper()
                        payload = data.get("data", {})
                    else:
                        # Direct format: {"e": "depthUpdate", "s": "BTCUSDT", ...}
                        payload = data
                        symbol = payload.get("s", "").upper()
                    
                    if not symbol:
                        logger.warning(f"Could not extract symbol from: {msg[:200]}")
                        continue
                        
                    logger.debug(f"Parsed symbol: {symbol}")
                    sequence = payload.get("lastUpdateId", payload.get("u", 0))
                    outer_ts = data.get("E", 0)
                    if outer_ts == 0:
                        outer_ts = int(time.time() * 1000)
                    msg_dict = {
                        "symbol": symbol,
                        "sequence": sequence,
                        "timestamp": outer_ts,
                        "bids": payload.get("b", []),
                        "asks": payload.get("a", []),
                        "type": "orderbook"
                    }
                    if self._resync_buffer.is_resyncing(symbol):
                        await self._resync_buffer.add(symbol, msg_dict)
                    else:
                        await self._publish_orderbook(msg_dict)
            except Exception as e:
                logger.error(f"Orderbook WS error: {e}")
                raise

    async def _connect_trade_stream_simple(self) -> None:
        streams = [f"{s.lower()}@trade" for s in self.symbols]
        url = f"{BINANCE_WS_URL}?streams={'/'.join(streams)}"
        logger.info(f"Connecting to trade stream: {url[:80]}...")
        async with websockets.connect(url, ping_timeout=60, ping_interval=25) as ws:
            self._trade_ws = ws
            logger.info("Trade stream WebSocket connected, waiting for messages...")
            logger.info(f"Trade symbols subscribed: {self.symbols}")
            try:
                while self._running:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=30)
                    except asyncio.TimeoutError:
                        logger.debug("Trade stream: no message for 30s, sending ping")
                        await ws.ping()
                        continue
                    data = json.loads(msg)
                    stream_name = data.get("stream", "")
                    symbol = stream_name.split("@")[0].upper() if stream_name else ""
                    payload = data.get("data", {})
                    outer_ts = data.get("E", 0)
                    if outer_ts == 0:
                        outer_ts = int(time.time() * 1000)
                    msg_dict = {
                        "symbol": symbol,
                        "trade_id": payload.get("t"),
                        "price": payload.get("p"),
                        "quantity": payload.get("q"),
                        "is_buyer_maker": payload.get("m"),
                        "timestamp": outer_ts,
                        "type": "trade"
                    }
                    await self._publish_trade(msg_dict)
            except Exception as e:
                logger.error(f"Trade WS error: {e}")
                raise

    async def _publish_orderbook(self, msg: dict) -> None:
        await self._redis.publish(f"raw:orderbook:{msg['symbol']}", msg)
        stream_msg = {"type": "orderbook", "symbol": msg["symbol"], "data": msg}
        await self._redis.publish("stream:microstructure", stream_msg)

    async def _publish_trade(self, msg: dict) -> None:
        await self._redis.publish(f"raw:trades:{msg['symbol']}", msg)
        stream_msg = {"type": "trade", "symbol": msg["symbol"], "data": msg}
        await self._redis.publish("stream:microstructure", stream_msg)