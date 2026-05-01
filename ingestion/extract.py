import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional

import aiohttp
import websockets
from prometheus_client import Counter, Gauge, Histogram
from pydantic import BaseModel, Field, field_validator

from core.config import RuntimeConfig, get_config
from core.redis_bus import get_redis

logger = logging.getLogger("ingestion.extract")

EXTRACT_MESSAGES = Counter(
    "extract_messages_total",
    "Total messages extracted",
    ["source", "symbol"]
)
EXTRACT_ERRORS = Counter(
    "extract_errors_total",
    "Total extraction errors",
    ["source", "error_type"]
)
EXTRACT_LATENCY = Histogram(
    "extract_latency_seconds",
    "Message extraction latency",
    ["source"]
)
ACTIVE_CONNECTIONS = Gauge(
    "extract_active_connections",
    "Number of active connections",
    ["connection_type"]
)


class ValidationError(Exception):
    pass


class OrderBookLevel(BaseModel):
    price: float = Field(gt=0)
    quantity: float = Field(gt=0)


class OrderBookUpdate(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    timestamp: int = Field(gt=0)
    bids: list[OrderBookLevel] = Field(min_length=1)
    asks: list[OrderBookLevel] = Field(min_length=1)

    @field_validator("symbol")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()


class TradeUpdate(BaseModel):
    symbol: str = Field(min_length=1)
    trade_id: int = Field(gt=0)
    price: float = Field(gt=0)
    quantity: float = Field(gt=0)
    is_buyer_maker: bool
    timestamp: int = Field(gt=0)

    @field_validator("symbol")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()


class FundingRateUpdate(BaseModel):
    symbol: str = Field(min_length=1)
    funding_rate: float
    funding_time: int = Field(gt=0)

    @field_validator("symbol")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()


class OpenInterestUpdate(BaseModel):
    symbol: str = Field(min_length=1)
    open_interest: float = Field(ge=0)
    timestamp: int = Field(gt=0)

    @field_validator("symbol")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()


class LiquidationUpdate(BaseModel):
    symbol: str = Field(min_length=1)
    price: float = Field(gt=0)
    quantity: float = Field(gt=0)
    side: str = Field(pattern="^(Buy|Sell)$")
    timestamp: int = Field(gt=0)

    @field_validator("symbol")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()


class AltDataUpdate(BaseModel):
    source: str = Field(min_length=1)
    data: dict[str, Any]
    timestamp: int = Field(gt=0)


class DataValidator:
    @staticmethod
    def validate_orderbook(data: dict) -> Optional[OrderBookUpdate]:
        try:
            return OrderBookUpdate(**data)
        except Exception as e:
            EXTRACT_ERRORS.labels(source="orderbook", error_type="validation").inc()
            logger.warning(f"Invalid orderbook data: {e}")
            return None

    @staticmethod
    def validate_trade(data: dict) -> Optional[TradeUpdate]:
        try:
            return TradeUpdate(**data)
        except Exception as e:
            EXTRACT_ERRORS.labels(source="trade", error_type="validation").inc()
            logger.warning(f"Invalid trade data: {e}")
            return None

    @staticmethod
    def validate_funding(data: dict) -> Optional[FundingRateUpdate]:
        try:
            return FundingRateUpdate(**data)
        except Exception as e:
            EXTRACT_ERRORS.labels(source="funding", error_type="validation").inc()
            logger.warning(f"Invalid funding data: {e}")
            return None

    @staticmethod
    def validate_oi(data: dict) -> Optional[OpenInterestUpdate]:
        try:
            return OpenInterestUpdate(**data)
        except Exception as e:
            EXTRACT_ERRORS.labels(source="open_interest", error_type="validation").inc()
            logger.warning(f"Invalid OI data: {e}")
            return None

    @staticmethod
    def validate_liquidation(data: dict) -> Optional[LiquidationUpdate]:
        try:
            return LiquidationUpdate(**data)
        except Exception as e:
            EXTRACT_ERRORS.labels(source="liquidation", error_type="validation").inc()
            logger.warning(f"Invalid liquidation data: {e}")
            return None


class RedisPublisher:
    def __init__(self):
        self._bus = get_redis()

    async def publish_orderbook(self, update: OrderBookUpdate) -> None:
        msg = update.model_dump()
        msg["timestamp"] = str(msg["timestamp"])
        msg["bids"] = [{"price": b.price, "quantity": b.quantity} for b in update.bids]
        msg["asks"] = [{"price": a.price, "quantity": a.quantity} for a in update.asks]
        await self._bus.publish("raw:orderbook", msg)
        EXTRACT_MESSAGES.labels(source="orderbook", symbol=update.symbol).inc()

    async def publish_trade(self, update: TradeUpdate) -> None:
        msg = update.model_dump()
        msg["timestamp"] = str(msg["timestamp"])
        await self._bus.publish("raw:trades", msg)
        EXTRACT_MESSAGES.labels(source="trade", symbol=update.symbol).inc()

    async def publish_funding(self, update: FundingRateUpdate) -> None:
        msg = update.model_dump()
        msg["funding_time"] = str(msg["funding_time"])
        await self._bus.publish("raw:funding", msg)
        EXTRACT_MESSAGES.labels(source="funding", symbol=update.symbol).inc()

    async def publish_oi(self, update: OpenInterestUpdate) -> None:
        msg = update.model_dump()
        msg["timestamp"] = str(msg["timestamp"])
        await self._bus.publish("raw:open_interest", msg)
        EXTRACT_MESSAGES.labels(source="open_interest", symbol=update.symbol).inc()

    async def publish_liquidation(self, update: LiquidationUpdate) -> None:
        msg = update.model_dump()
        msg["timestamp"] = str(msg["timestamp"])
        await self._bus.publish("raw:liquidations", msg)
        EXTRACT_MESSAGES.labels(source="liquidation", symbol=update.symbol).inc()

    async def publish_altdata(self, update: AltDataUpdate) -> None:
        await self._bus.publish(f"raw:altdata:{update.source}", update.model_dump())
        EXTRACT_MESSAGES.labels(source=f"altdata:{update.source}", symbol="n/a").inc()


@dataclass
class BackoffConfig:
    base_delay: float = 1.0
    max_delay: float = 60.0
    max_retries: int = 5
    jitter: float = 0.1


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
        delay *= (1 + self.config.jitter * (2 * asyncio.get_running_loop().time() % 1 - 0.5))
        logger.info(f"Backoff: waiting {delay:.2f}s (attempt {self.attempt + 1}/{self.config.max_retries})")
        await asyncio.sleep(delay)
        self.attempt += 1

    @property
    def exhausted(self) -> bool:
        return self.attempt >= self.config.max_retries


class BinanceWebSocketManager:
    BASE_URL = "wss://fstream.binance.com/ws"

    def __init__(
        self,
        symbols: list[str],
        publisher: RedisPublisher,
        backoff_config: BackoffConfig = BackoffConfig()
    ):
        self.symbols = set(symbols)
        self.publisher = publisher
        self.backoff_config = backoff_config
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._running = False
        self._orderbook_reconnect_event = asyncio.Event()
        self._trade_reconnect_event = asyncio.Event()
        self._orderbook_reconnect_event.set()
        self._trade_reconnect_event.set()

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._run_orderbook_streams())
        asyncio.create_task(self._run_trade_streams())
        logger.info("Binance WebSocket manager started")

    async def stop(self) -> None:
        self._running = False
        if self._ws:
            await self._ws.close()
        logger.info("Binance WebSocket manager stopped")

    async def update_symbols(self, symbols: list[str]) -> None:
        old_symbols = self.symbols
        self.symbols = set(symbols)
        added = self.symbols - old_symbols
        removed = old_symbols - self.symbols
        if added or removed:
            logger.info(f"Symbols updated: added={added}, removed={removed}")
            self._orderbook_reconnect_event.set()
            self._trade_reconnect_event.set()

    async def _run_orderbook_streams(self) -> None:
        while self._running:
            await self._orderbook_reconnect_event.wait()
            self._orderbook_reconnect_event.clear()
            if not self.symbols:
                await asyncio.sleep(1)
                continue
            backoff = ExponentialBackoff(self.backoff_config)
            while self._running and self.symbols:
                try:
                    await self._connect_orderbook_stream()
                except Exception as e:
                    EXTRACT_ERRORS.labels(source="orderbook_ws", error_type="connection").inc()
                    logger.error(f"Orderbook stream error: {e}")
                    if not backoff.exhausted:
                        await backoff.wait()
                    else:
                        logger.error("Orderbook stream exhausted retries, waiting 30s before retry")
                        await asyncio.sleep(30)
                        backoff.reset()

    async def _run_trade_streams(self) -> None:
        while self._running:
            await self._trade_reconnect_event.wait()
            self._trade_reconnect_event.clear()
            if not self.symbols:
                await asyncio.sleep(1)
                continue
            backoff = ExponentialBackoff(self.backoff_config)
            while self._running and self.symbols:
                try:
                    await self._connect_trade_stream()
                except Exception as e:
                    EXTRACT_ERRORS.labels(source="trade_ws", error_type="connection").inc()
                    logger.error(f"Trade stream error: {e}")
                    if not backoff.exhausted:
                        await backoff.wait()
                    else:
                        logger.error("Trade stream exhausted retries, waiting 30s before retry")
                        await asyncio.sleep(30)
                        backoff.reset()

    async def _connect_orderbook_stream(self) -> None:
        streams = [f"{s.lower()}@depth20@100ms" for s in self.symbols]
        url = f"{self.BASE_URL}?streams={'/'.join(streams)}"
        logger.info(f"Connecting to orderbook stream: {url[:80]}...")
        async with websockets.connect(url, ping_timeout=30) as ws:
            ACTIVE_CONNECTIONS.labels(connection_type="orderbook").inc()
            try:
                while self._running:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=30)
                    except asyncio.TimeoutError:
                        await ws.ping()
                        continue
                    start = time.perf_counter()
                    data = await self._parse_orderbook(msg)
                    if data:
                        await self.publisher.publish_orderbook(data)
                    EXTRACT_LATENCY.labels(source="orderbook").observe(time.perf_counter() - start)
            finally:
                ACTIVE_CONNECTIONS.labels(connection_type="orderbook").dec()

    async def _connect_trade_stream(self) -> None:
        streams = [f"{s.lower()}@trade" for s in self.symbols]
        url = f"{self.BASE_URL}?streams={'/'.join(streams)}"
        logger.info(f"Connecting to trade stream: {url[:80]}...")
        async with websockets.connect(url, ping_timeout=30) as ws:
            ACTIVE_CONNECTIONS.labels(connection_type="trade").inc()
            try:
                while self._running:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=30)
                    except asyncio.TimeoutError:
                        await ws.ping()
                        continue
                    start = time.perf_counter()
                    data = await self._parse_trade(msg)
                    if data:
                        await self.publisher.publish_trade(data)
                    EXTRACT_LATENCY.labels(source="trade").observe(time.perf_counter() - start)
            finally:
                ACTIVE_CONNECTIONS.labels(connection_type="trade").dec()

    async def _parse_orderbook(self, msg: str) -> Optional[OrderBookUpdate]:
        data = json.loads(msg)
        stream_name = data.get("stream", "")
        symbol = stream_name.split("@")[0].upper() if stream_name else ""
        outer_ts = data.get("E", 0)
        if outer_ts == 0:
            outer_ts = int(time.time() * 1000)
        payload = data.get("data", {})
        validated = DataValidator.validate_orderbook({
            "symbol": symbol,
            "timestamp": outer_ts,
            "bids": [{"price": float(p), "quantity": float(q)} for p, q in payload.get("b", [])],
            "asks": [{"price": float(p), "quantity": float(q)} for p, q in payload.get("a", [])]
        })
        return validated

    async def _parse_trade(self, msg: str) -> Optional[TradeUpdate]:
        data = json.loads(msg)
        stream_name = data.get("stream", "")
        symbol = stream_name.split("@")[0].upper() if stream_name else ""
        outer_ts = data.get("E", 0)
        if outer_ts == 0:
            outer_ts = int(time.time() * 1000)
        payload = data.get("data", {})
        validated = DataValidator.validate_trade({
            "symbol": symbol,
            "trade_id": int(payload.get("t", 0)),
            "price": float(payload.get("p", 0)),
            "quantity": float(payload.get("q", 0)),
            "is_buyer_maker": payload.get("m", False),
            "timestamp": outer_ts
        })
        return validated


class BinanceRESTPoller:
    BASE_URL = "https://fapi.binance.com/fapi/v1"

    def __init__(
        self,
        symbols: list[str],
        publisher: RedisPublisher,
        config: RuntimeConfig,
        session: aiohttp.ClientSession
    ):
        self.symbols = set(symbols)
        self.publisher = publisher
        self.config = config
        self.session = session
        self._running = False
        self._funding_interval: Optional[asyncio.Task] = None
        self._oi_interval: Optional[asyncio.Task] = None

    async def start(self) -> None:
        self._running = True
        self._funding_interval = asyncio.create_task(self._poll_funding())
        self._oi_interval = asyncio.create_task(self._poll_open_interest())
        logger.info("Binance REST poller started")

    async def stop(self) -> None:
        self._running = False
        if self._funding_interval:
            self._funding_interval.cancel()
        if self._oi_interval:
            self._oi_interval.cancel()
        logger.info("Binance REST poller stopped")

    async def update_symbols(self, symbols: list[str]) -> None:
        self.symbols = set(symbols)
        logger.info(f"Updated symbols for REST poller: {symbols}")

    async def _poll_funding(self) -> None:
        interval = 8 * 3600
        while self._running:
            try:
                for symbol in self.symbols:
                    try:
                        async with self.session.get(
                            f"{self.BASE_URL}/fundingRate",
                            params={"symbol": symbol, "limit": 1}
                        ) as resp:
                            if resp.status == 200:
                                data = await resp.json()
                                if data:
                                    validated = DataValidator.validate_funding({
                                        "symbol": data[0].get("symbol", ""),
                                        "funding_rate": float(data[0].get("fundingRate", 0)),
                                        "funding_time": int(data[0].get("fundingTime", 0))
                                    })
                                    if validated:
                                        await self.publisher.publish_funding(validated)
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
                            f"{self.BASE_URL}/openInterest",
                            params={"symbol": symbol}
                        ) as resp:
                            if resp.status == 200:
                                data = await resp.json()
                                validated = DataValidator.validate_oi({
                                    "symbol": data.get("symbol", ""),
                                    "open_interest": float(data.get("openInterest", 0)),
                                    "timestamp": data.get("time", 0)
                                })
                                if validated:
                                    await self.publisher.publish_oi(validated)
                    except Exception as e:
                        logger.warning(f"OI poll error for {symbol}: {e}")
            except Exception as e:
                logger.error(f"OI polling error: {e}")
            await asyncio.sleep(interval)


class AltDataIngestorBase(ABC):
    @property
    @abstractmethod
    def source_name(self) -> str:
        pass

    @abstractmethod
    async def fetch(self) -> Optional[dict]:
        pass


class RedditIngestor(AltDataIngestorBase):
    @property
    def source_name(self) -> str:
        return "reddit"

    async def fetch(self) -> Optional[dict]:
        return None


class FredIngestor(AltDataIngestorBase):
    @property
    def source_name(self) -> str:
        return "fred"

    async def fetch(self) -> Optional[dict]:
        return None


class GoogleTrendsIngestor(AltDataIngestorBase):
    @property
    def source_name(self) -> str:
        return "google_trends"

    async def fetch(self) -> Optional[dict]:
        return None


class OnChainIngestor(AltDataIngestorBase):
    @property
    def source_name(self) -> str:
        return "on_chain"

    async def fetch(self) -> Optional[dict]:
        return None


class AltDataDelegator:
    INGESTOR_INTERVALS = {
        "reddit": 300,
        "google_trends": 3600,
        "fred": 86400,
        "on_chain": 60
    }

    def __init__(self, publisher: RedisPublisher):
        self.publisher = publisher
        self.ingestors: list[AltDataIngestorBase] = [
            RedditIngestor(),
            FredIngestor(),
            GoogleTrendsIngestor(),
            OnChainIngestor()
        ]
        self._tasks: list[asyncio.Task] = []
        self._running = False

    async def start(self) -> None:
        self._running = True
        for ingestor in self.ingestors:
            interval = self.INGESTOR_INTERVALS.get(ingestor.source_name, 300)
            task = asyncio.create_task(self._run_ingestor(ingestor, interval))
            self._tasks.append(task)
        logger.info(f"AltData delegator started with {len(self.ingestors)} ingestors")

    async def stop(self) -> None:
        self._running = False
        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        logger.info("AltData delegator stopped")

    async def _run_ingestor(self, ingestor: AltDataIngestorBase, interval: int) -> None:
        while self._running:
            try:
                data = await ingestor.fetch()
                if data:
                    await self.publisher.publish_altdata(AltDataUpdate(
                        source=ingestor.source_name,
                        data=data,
                        timestamp=int(time.time() * 1000)
                    ))
            except Exception as e:
                EXTRACT_ERRORS.labels(source=f"altdata:{ingestor.source_name}", error_type="fetch").inc()
                logger.warning(f"AltData ingestor {ingestor.source_name} error: {e}")
            await asyncio.sleep(interval)


class SymbolManager:
    def __init__(self, config):
        self.config = config
        self._symbols: set[str] = set(config.get_symbols())
        self._stop_event = asyncio.Event()

    def stop(self) -> None:
        self._stop_event.set()

    def get_symbols(self) -> list[str]:
        return list(self._symbols)

    def add_symbol(self, symbol: str) -> None:
        self._symbols.add(symbol.upper())

    def remove_symbol(self, symbol: str) -> None:
        self._symbols.discard(symbol.upper())

    async def start_monitoring(self, on_change: callable) -> None:
        while not self._stop_event.is_set():
            db_symbols = set(self.config.get_symbols())
            if db_symbols != self._symbols:
                added = db_symbols - self._symbols
                removed = self._symbols - db_symbols
                self._symbols = db_symbols
                await on_change(list(db_symbols))
                logger.info(f"Symbols changed: added={added}, removed={removed}")
            await asyncio.sleep(5)
        logger.info("SymbolManager monitoring stopped")


class DataExtractor:
    def __init__(self):
        self.publisher = RedisPublisher()
        self.config = get_config()
        self.symbol_manager = SymbolManager(self.config)
        self.ws_manager: Optional[BinanceWebSocketManager] = None
        self.rest_poller: Optional[BinanceRESTPoller] = None
        self.altdata_delegator: Optional[AltDataDelegator] = None
        self._http_session: Optional[aiohttp.ClientSession] = None
        self._running = False
        self._monitoring_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        self._http_session = aiohttp.ClientSession()
        symbols = self.symbol_manager.get_symbols()

        self.ws_manager = BinanceWebSocketManager(symbols, self.publisher)
        await self.ws_manager.start()

        self.rest_poller = BinanceRESTPoller(
            symbols, self.publisher, self.config.runtime, self._http_session
        )
        await self.rest_poller.start()

        self.altdata_delegator = AltDataDelegator(self.publisher)
        await self.altdata_delegator.start()

        self._monitoring_task = asyncio.create_task(
            self.symbol_manager.start_monitoring(self._on_symbols_changed)
        )

        self._running = True
        logger.info("Data extractor started")

    async def stop(self) -> None:
        self._running = False
        self.symbol_manager.stop()
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
        if self.ws_manager:
            await self.ws_manager.stop()
        if self.rest_poller:
            await self.rest_poller.stop()
        if self.altdata_delegator:
            await self.altdata_delegator.stop()
        if self._http_session:
            await self._http_session.close()
        logger.info("Data extractor stopped")

    async def _on_symbols_changed(self, symbols: list[str]) -> None:
        if self.ws_manager:
            await self.ws_manager.update_symbols(symbols)
        if self.rest_poller:
            await self.rest_poller.update_symbols(symbols)

    def add_symbol(self, symbol: str) -> None:
        self.symbol_manager.add_symbol(symbol)

    def remove_symbol(self, symbol: str) -> None:
        self.symbol_manager.remove_symbol(symbol)

    def get_active_symbols(self) -> list[str]:
        return self.symbol_manager.get_symbols()


extractor: Optional[DataExtractor] = None


async def create_extractor() -> DataExtractor:
    global extractor
    extractor = DataExtractor()
    await extractor.start()
    return extractor


async def get_extractor() -> Optional[DataExtractor]:
    return extractor