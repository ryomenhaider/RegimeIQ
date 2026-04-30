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


class Loader:
    def __init__(self):
        self._db = get_db()
        self._redis = get_redis()
        self._cache = get_cache()

    async def load_orderbook(self, snapshot: OrderBookSnapshot) -> None:
        timestamp = snapshot.timestamp // 1000

        cumulative_buy = 0.0
        for level, (price, qty) in enumerate(snapshot.bids):
            cumulative_buy += qty
            await self._db.execute(
                """INSERT INTO microstructure_raw
                   (symbol, timestamp, side, price, quantity, level, cumulative_quantity)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                snapshot.symbol, timestamp, "buy", price, qty, level, cumulative_buy
            )

        cumulative_sell = 0.0
        for level, (price, qty) in enumerate(snapshot.asks):
            cumulative_sell += qty
            await self._db.execute(
                """INSERT INTO microstructure_raw
                   (symbol, timestamp, side, price, quantity, level, cumulative_quantity)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                snapshot.symbol, timestamp, "sell", price, qty, level, cumulative_sell
            )

        stream_data = {
            "type": "orderbook",
            "symbol": snapshot.symbol,
            "timestamp": snapshot.timestamp,
            "mid_price": snapshot.mid_price,
            "bid_ask_imbalance": snapshot.bid_ask_imbalance,
        }
        await self._redis.publish("stream:microstructure", stream_data, maxlen=MICROSTRUCTURE_MAXLEN)

        await self._update_cache(snapshot.symbol, "orderbook", stream_data)

    async def load_trade(self, trade: TradeEvent) -> None:
        timestamp = trade.timestamp // 1000

        side = "sell" if trade.buyer_maker else "buy"

        await self._db.execute(
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

        await self._update_cache(trade.symbol, "trade", stream_data)

    async def load_futures(self, futures: FuturesSnapshot) -> None:
        timestamp = futures.timestamp // 1000

        await self._db.execute(
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

        await self._update_cache(futures.symbol, "futures", stream_data)

    async def load_altdata(self, altdata: AltDataPoint) -> None:
        timestamp = altdata.timestamp // 1000

        await self._db.execute(
            """INSERT INTO alt_data_signals
               (symbol, source, timestamp, value, z_score, metadata)
               VALUES ($1, $2, $3, $4, $5, $6)""",
            None, altdata.source, timestamp, altdata.value, altdata.z_score,
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

    async def _update_cache(self, symbol: str, field: str, data: dict[str, Any]) -> None:
        cache_key = f"state:{symbol}"
        existing = await self._cache.get(cache_key)

        if existing is None:
            existing = {}

        existing[field] = data
        existing["last_update"] = data.get("timestamp", 0)

        await self._cache.set(cache_key, existing, STATE_CACHE_TTL)


_loader: Optional[Loader] = None


def get_loader() -> Loader:
    global _loader
    if _loader is None:
        _loader = Loader()
    return _loader