import asyncio
import json
import logging
from typing import Any, Optional

from core.cache import get_cache
from core.database import get_db
from core.redis_bus import get_redis
from ingestion.transform import (
    AltDataPoint,
    FuturesSnapshot,
    OrderBookSnapshot,
    TradeEvent,
)

logger = logging.getLogger("ingestion.load")

MICROSTRUCTURE_MAXLEN = 10000
FUTURES_MAXLEN = 10000
ALT_DATA_MAXLEN = 1000
STATE_CACHE_TTL = 60
DB_QUEUE_SIZE = 1000
MAX_PARAMS = 30000


def _chunk_list(lst: list, chunk_size: int):
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]


class Loader:
    def __init__(self):
        self._db = get_db()
        self._redis = get_redis()
        self._cache = get_cache()
        self._db_queue: asyncio.Queue = asyncio.Queue(maxsize=DB_QUEUE_SIZE)
        self._db_worker_task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self) -> None:
        self._running = True
        self._db_worker_task = asyncio.create_task(self._db_worker())
        logger.info("Loader started with background DB worker")

    async def stop(self) -> None:
        self._running = False
        if self._db_worker_task:
            self._db_worker_task.cancel()
            try:
                await self._db_worker_task
            except asyncio.CancelledError:
                pass
        logger.info("Loader stopped")

    async def _db_worker(self) -> None:
        while self._running:
            batch = []
            try:
                item = await asyncio.wait_for(self._db_queue.get(), timeout=1.0)
                batch.append(item)
            except asyncio.TimeoutError:
                continue

            while not self._db_queue.empty() and len(batch) < 100:
                try:
                    batch.append(self._db_queue.get_nowait())
                except asyncio.QueueEmpty:
                    break

            if batch:
                await self._execute_batch(batch)

    async def _execute_batch(self, batch: list[dict[str, Any]]) -> None:
        for item in batch:
            try:
                await self._db.execute(item["query"], *item["args"])
            except Exception as e:
                logger.error(f"DB write failed: {e}")

    async def _enqueue_db_write(self, query: str, *args: Any) -> None:
        try:
            self._db_queue.put_nowait({"query": query, "args": args})
        except asyncio.QueueFull:
            logger.warning("DB queue full, dropping write")

    async def load_orderbook(self, snapshot: OrderBookSnapshot) -> None:
        timestamp = snapshot.timestamp // 1000

        bid_values = []
        cumulative_buy = 0.0
        for level, (price, qty) in enumerate(snapshot.bids):
            cumulative_buy += qty
            bid_values.append((snapshot.symbol, timestamp, "buy", price, qty, level, cumulative_buy))

        ask_values = []
        cumulative_sell = 0.0
        for level, (price, qty) in enumerate(snapshot.asks):
            cumulative_sell += qty
            ask_values.append((snapshot.symbol, timestamp, "sell", price, qty, level, cumulative_sell))

        all_values = bid_values + ask_values
        if not all_values:
            return

        num_params_per_row = 7
        max_rows = MAX_PARAMS // num_params_per_row

        if len(all_values) <= max_rows:
            query = """
                INSERT INTO microstructure_raw
                (symbol, timestamp, side, price, quantity, level, cumulative_quantity)
                VALUES """ + ",".join([f"(${i*7+1}, ${i*7+2}, ${i*7+3}, ${i*7+4}, ${i*7+5}, ${i*7+6}, ${i*7+7})" for i in range(len(all_values))])
            flat_args = [val for tup in all_values for val in tup]
            await self._enqueue_db_write(query, *flat_args)
        else:
            logger.warning(f"Bulk insert too large ({len(all_values)} rows), splitting")
            for chunk in _chunk_list(all_values, max_rows):
                query = """
                    INSERT INTO microstructure_raw
                    (symbol, timestamp, side, price, quantity, level, cumulative_quantity)
                    VALUES """ + ",".join([f"(${i*7+1}, ${i*7+2}, ${i*7+3}, ${i*7+4}, ${i*7+5}, ${i*7+6}, ${i*7+7})" for i in range(len(chunk))])
                flat_args = [val for tup in chunk for val in tup]
                await self._enqueue_db_write(query, *flat_args)

        stream_data = {
            "type": "orderbook",
            "symbol": snapshot.symbol,
            "timestamp": snapshot.timestamp,
            "mid_price": snapshot.mid_price,
            "bid_ask_imbalance": snapshot.bid_ask_imbalance,
        }
        await self._redis.publish("stream:microstructure", stream_data, maxlen=MICROSTRUCTURE_MAXLEN)
        await self._update_cache_atomic(snapshot.symbol, "orderbook", stream_data)

    async def load_trade(self, trade: TradeEvent) -> None:
        timestamp = trade.timestamp // 1000
        side = "sell" if trade.buyer_maker else "buy"

        await self._enqueue_db_write(
            """INSERT INTO microstructure_raw
               (symbol, timestamp, side, price, quantity)
               VALUES ($1, $2, $3, $4, $5)""",
            trade.symbol, timestamp, side, trade.price, trade.qty
        )

        stream_data = {
            "type": "trade",
            "symbol": trade.symbol,
            "timestamp": trade.timestamp,
            "price": trade.price,
            "qty": trade.qty,
            "side": side,
        }
        await self._redis.publish("stream:microstructure", stream_data, maxlen=MICROSTRUCTURE_MAXLEN)
        await self._update_cache_atomic(trade.symbol, "trade", stream_data)

    async def load_futures(self, futures: FuturesSnapshot) -> None:
        timestamp = futures.timestamp // 1000

        await self._enqueue_db_write(
            """INSERT INTO futures_data
               (symbol, timestamp, funding_rate, open_interest, liquidations)
               VALUES ($1, $2, $3, $4, $5)""",
            futures.symbol, timestamp, futures.funding_rate, futures.open_interest,
            json.dumps(futures.liquidations) if futures.liquidations else None
        )

        stream_data = {
            "type": "futures",
            "symbol": futures.symbol,
            "timestamp": futures.timestamp,
            "funding_rate": futures.funding_rate,
            "open_interest": futures.open_interest,
        }
        await self._redis.publish("stream:futures", stream_data, maxlen=FUTURES_MAXLEN)
        await self._update_cache_atomic(futures.symbol, "futures", stream_data)

    async def load_altdata(self, altdata: AltDataPoint) -> None:
        timestamp = altdata.timestamp // 1000

        await self._enqueue_db_write(
            """INSERT INTO alt_data_signals
               (source, timestamp, value, z_score, metadata)
               VALUES ($1, $2, $3, $4, $5)""",
            altdata.source, timestamp, altdata.value, altdata.z_score,
            json.dumps(altdata.raw_payload)
        )

        stream_data = {
            "type": "altdata",
            "source": altdata.source,
            "timestamp": altdata.timestamp,
            "value": altdata.value,
            "z_score": altdata.z_score,
        }
        await self._redis.publish("stream:altdata", stream_data, maxlen=ALT_DATA_MAXLEN)

    async def _update_cache_atomic(self, symbol: str, field: str, data: dict[str, Any]) -> None:
        cache = self._cache
        cache_key = f"state:{symbol}"
        data_json = json.dumps(data)
        await cache.redis.hset(cache_key, field, data_json)
        await cache.redis.expire(cache_key, STATE_CACHE_TTL)


_loader: Optional[Loader] = None


def get_loader() -> Loader:
    global _loader
    if _loader is None:
        _loader = Loader()
    return _loader