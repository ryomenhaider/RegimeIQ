import asyncio
import json
import logging
import time
from typing import Optional

import aiohttp
import websockets
from core.circuit_breaker import CircuitBreakerConfig, get_circuit_breaker
from core.redis_bus import get_redis

logger = logging.getLogger("ingestion.ingestors.binance_futures")

BINANCE_FUTURES_BASE_URL = "https://fapi.binance.com/fapi/v1"
BINANCE_WS_URL = "wss://fstream.binance.com/ws"


class BinanceFuturesIngestor:
    def __init__(self, symbols: list[str], session: aiohttp.ClientSession):
        self.symbols = set(symbols)
        self.session = session
        self._circuit_breaker = get_circuit_breaker(
            "binance_rest",
            CircuitBreakerConfig(failure_threshold=5, window_seconds=60, wait_seconds=30)
        )
        self._circuit_breaker_ws = get_circuit_breaker(
            "binance_ws",
            CircuitBreakerConfig(failure_threshold=3, window_seconds=30, wait_seconds=60)
        )
        self._redis = get_redis()
        self._running = False
        self._funding_task: Optional[asyncio.Task] = None
        self._oi_task: Optional[asyncio.Task] = None
        self._liquidation_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        self._running = True
        self._funding_task = asyncio.create_task(self._poll_funding())
        self._oi_task = asyncio.create_task(self._poll_open_interest())
        self._liquidation_task = asyncio.create_task(self._run_liquidation_stream())
        logger.info("BinanceFuturesIngestor started")

    async def stop(self) -> None:
        self._running = False
        if self._funding_task:
            self._funding_task.cancel()
        if self._oi_task:
            self._oi_task.cancel()
        if self._liquidation_task:
            self._liquidation_task.cancel()
        await asyncio.gather(
            self._funding_task or asyncio.sleep(0),
            self._oi_task or asyncio.sleep(0),
            self._liquidation_task or asyncio.sleep(0),
            return_exceptions=True
        )
        logger.info("BinanceFuturesIngestor stopped")

    async def update_symbols(self, symbols: list[str]) -> None:
        self.symbols = set(symbols)
        logger.info(f"Updated symbols for BinanceFuturesIngestor: {symbols}")

    async def _poll_funding(self) -> None:
        interval = 60
        while self._running:
            try:
                for symbol in self.symbols:
                    try:
                        async with self.session.get(
                            f"{BINANCE_FUTURES_BASE_URL}/fundingRate",
                            params={"symbol": symbol, "limit": 1}
                        ) as resp:
                            if resp.status == 200:
                                data = await resp.json()
                                if data:
                                    msg = {
                                        "symbol": data[0].get("symbol", symbol),
                                        "funding_rate": float(data[0].get("fundingRate", 0)),
                                        "funding_time": int(data[0].get("fundingTime", 0)),
                                        "type": "funding"
                                    }
                                    await self._redis.publish(f"raw:funding:{symbol}", msg)
                    except Exception as e:
                        logger.warning(f"Funding poll error for {symbol}: {e}")
            except Exception as e:
                logger.error(f"Funding polling error: {e}")
            await asyncio.sleep(interval)

    async def _poll_open_interest(self) -> None:
        interval = 60
        while self._running:
            try:
                for symbol in self.symbols:
                    try:
                        async with self.session.get(
                            f"{BINANCE_FUTURES_BASE_URL}/openInterest",
                            params={"symbol": symbol}
                        ) as resp:
                            if resp.status == 200:
                                data = await resp.json()
                                msg = {
                                    "symbol": data.get("symbol", symbol),
                                    "open_interest": float(data.get("openInterest", 0)),
                                    "timestamp": data.get("time", int(time.time() * 1000)),
                                    "type": "open_interest"
                                }
                                await self._redis.publish(f"raw:open_interest:{symbol}", msg)
                    except Exception as e:
                        logger.warning(f"OI poll error for {symbol}: {e}")
            except Exception as e:
                logger.error(f"OI polling error: {e}")
            await asyncio.sleep(interval)

    async def _run_liquidation_stream(self) -> None:
        while self._running:
            if not self.symbols:
                await asyncio.sleep(1)
                continue
            backoff = ExponentialBackoffSimple()
            while self._running and self.symbols:
                try:
                    streams = [f"{s.lower()}@forceOrder" for s in self.symbols]
                    url = f"{BINANCE_WS_URL}?streams={'/'.join(streams)}"
                    logger.info(f"Connecting to liquidation stream: {url}")
                    async with websockets.connect(url, ping_timeout=30, open_timeout=10) as ws:
                        logger.info("Liquidation stream connected")
                        try:
                            while self._running:
                                try:
                                    msg = await asyncio.wait_for(ws.recv(), timeout=30)
                                except asyncio.TimeoutError:
                                    await ws.ping()
                                    continue
                                data = json.loads(msg)
                                payload = data.get("data", {})
                                msg_dict = {
                                    "symbol": payload.get("s", ""),
                                    "price": float(payload.get("p", 0)),
                                    "quantity": float(payload.get("q", 0)),
                                    "side": payload.get("S", "Sell"),
                                    "timestamp": payload.get("T", int(time.time() * 1000)),
                                    "type": "liquidation"
                                }
                                if msg_dict["symbol"]:
                                    await self._redis.publish(f"raw:liquidations:{msg_dict['symbol']}", msg_dict)
                        except Exception as e:
                            logger.error(f"Liquidation WS error: {e}")
                            raise
                except Exception as e:
                    logger.error(f"Liquidation stream error: {e}")
                    if not backoff.exhausted:
                        await backoff.wait()
                    else:
                        logger.error("Liquidation stream exhausted retries, waiting 30s")
                        await asyncio.sleep(30)
                        backoff.reset()


class ExponentialBackoffSimple:
    def __init__(self, base_delay: float = 1.0, max_retries: int = 5):
        self.base_delay = base_delay
        self.max_retries = max_retries
        self.attempt = 0

    def reset(self) -> None:
        self.attempt = 0

    async def wait(self) -> None:
        if self.attempt >= self.max_retries:
            raise ConnectionError("Max retries exceeded")
        delay = min(self.base_delay * (2 ** self.attempt), 60)
        await asyncio.sleep(delay)
        self.attempt += 1

    @property
    def exhausted(self) -> bool:
        return self.attempt >= self.max_retries