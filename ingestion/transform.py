import logging
import math
from collections import deque
from typing import  Optional

from models import AltDataPoint
from models import FuturesSnapshot
from models import TradeEvent
from models import OrderBookSnapshot

from core.config import get_config

logger = logging.getLogger(__name__)

class ZScoreNormalizer:
    def __init__(self):
        self._buffers: dict[str, deque[float]] = {}
        self._config = get_config()

    def _get_window_size(self) -> int:
        return self._config.get("zscore_window", 100)

    def _get_buffer(self, source: str) -> deque[float]:
        if source not in self._buffers:
            window_size = self._get_window_size()
            self._buffers[source] = deque(maxlen=window_size)
        return self._buffers[source]

    def compute(self, source: str, value: float) -> float:
        buffer = self._get_buffer(source)
        buffer.append(value)

        if len(buffer) < 10:
            return 0.0

        mean = sum(buffer) / len(buffer)
        variance = sum((x - mean) ** 2 for x in buffer) / len(buffer)
        std = math.sqrt(variance)

        if std == 0:
            return 0.0

        return (value - mean) / std

    def get_buffer_size(self, source: str) -> int:
        return len(self._buffers.get(source, []))


class Transformer:
    def __init__(self):
        self._zscore = ZScoreNormalizer()

    def transform_orderbook(self, data: dict) -> OrderBookSnapshot:
        symbol = data.get("symbol", "")
        timestamp = data.get("timestamp", 0)

        bids_raw = data.get("bids", [])
        asks_raw = data.get("asks", [])

        bids = [(b["price"], b["quantity"]) for b in bids_raw]
        asks = [(a["price"], a["quantity"]) for a in asks_raw]

        bid_total = sum(qty for _, qty in bids)
        ask_total = sum(qty for _, qty in asks)

        if (bid_total + ask_total) > 0:
            bid_ask_imbalance = (bid_total - ask_total) / (bid_total + ask_total)
        else:
            bid_ask_imbalance = 0.0

        best_bid = bids[0][0] if bids else 0.0
        best_ask = asks[0][0] if asks else 0.0
        mid_price = (best_bid + best_ask) / 2 if (best_bid > 0 and best_ask > 0) else 0.0

        return OrderBookSnapshot(
            symbol=symbol,
            timestamp=timestamp,
            bids=bids,
            asks=asks,
            bid_ask_imbalance=bid_ask_imbalance,
            mid_price=mid_price
        )

    def transform_trade(self, data: dict) -> TradeEvent:
        return TradeEvent(
            symbol=data.get("symbol", ""),
            timestamp=data.get("timestamp", 0),
            price=float(data.get("price", 0)),
            qty=float(data.get("quantity", 0)),
            buyer_maker=data.get("is_buyer_maker", False)
        )

    def transform_futures(self, data: dict) -> FuturesSnapshot:
        symbol = data.get("symbol", "")
        timestamp = data.get("timestamp", 0)

        funding_rate = data.get("funding_rate")
        if funding_rate is not None:
            funding_rate = float(funding_rate)

        open_interest = data.get("open_interest")
        if open_interest is not None:
            open_interest = float(open_interest)

        liquidations = data.get("liquidations")
        if liquidations is not None and not isinstance(liquidations, list):
            liquidations = None

        return FuturesSnapshot(
            symbol=symbol,
            funding_rate=funding_rate,
            open_interest=open_interest,
            liquidations=liquidations,
            timestamp=timestamp
        )

    def transform_altdata(self, data: dict) -> AltDataPoint:
        source = data.get("source", "")
        timestamp = data.get("timestamp", 0)

        value_field = data.get("value")
        if value_field is not None:
            value = float(value_field)
        else:
            value = 0.0

        z_score = self._zscore.compute(source, value)

        raw_payload = data.get("data", {})

        return AltDataPoint(
            source=source,
            value=value,
            z_score=z_score,
            raw_payload=raw_payload,
            timestamp=timestamp
        )


_transformer: Optional[Transformer] = None


def get_transformer() -> Transformer:
    global _transformer
    if _transformer is None:
        _transformer = Transformer()
    return _transformer