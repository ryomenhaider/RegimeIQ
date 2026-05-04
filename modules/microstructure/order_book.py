from sortedcontainers import SortedList
from typing import Any, Optional
from dataclasses import dataclass, field
import asyncio
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class MicrostructureOutput:
    symbol: str
    timestamp: int
    ofi: float = 0.0
    ofi_ma_10: float = 0.0
    vpin: float = 0.0
    kyle_lambda: Optional[float] = None
    cvd: float = 0.0
    trade_intensity: float = 0.0
    spread: Optional[float] = None
    mid_price: Optional[float] = None
    weighted_mid_price: Optional[float] = None
    depth_imbalance: Optional[float] = None
    adverse_selection_pct: float = 0.5
    vwap_deviation: Optional[float] = None
    bid_pressure: float = 0.0
    ask_pressure: float = 0.0
    top_bid: Optional[float] = None
    top_ask: Optional[float] = None
    bids: list = field(default_factory=list)
    asks: list = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "timestamp": self.timestamp,
            "ofi": self.ofi,
            "ofi_ma_10": self.ofi_ma_10,
            "vpin": self.vpin,
            "kyle_lambda": self.kyle_lambda,
            "cvd": self.cvd,
            "trade_intensity": self.trade_intensity,
            "spread": self.spread,
            "mid_price": self.mid_price,
            "weighted_mid_price": self.weighted_mid_price,
            "depth_imbalance": self.depth_imbalance,
            "adverse_selection_pct": self.adverse_selection_pct,
            "vwap_deviation": self.vwap_deviation,
            "bid_pressure": self.bid_pressure,
            "ask_pressure": self.ask_pressure,
            "top_bid": self.top_bid,
            "top_ask": self.top_ask,
            "bids": self.bids,
            "asks": self.asks,
        }


class OrderBook:
    def __init__(self):
        self._bids: SortedList = SortedList(key=lambda x: -x[0])
        self._asks: SortedList = SortedList(key=lambda x: x[0])
        self._last_update_id: int = 0
        self._resync_needed: bool = False

    @property
    def bids(self) -> SortedList:
        return self._bids

    @property
    def asks(self) -> SortedList:
        return self._asks

    @property
    def last_update_id(self) -> int:
        return self._last_update_id

    @property
    def resync_needed(self) -> bool:
        return self._resync_needed

    def clear(self) -> None:
        self._bids.clear()
        self._asks.clear()
        self._last_update_id = 0
        self._resync_needed = False

    def _find_level(self, side: str, price: float) -> int:
        collection = self._bids if side == "bid" else self._asks
        for i, (p, _) in enumerate(collection):
            if p == price:
                return i
        return -1

    def apply_snapshot(
        self,
        bids: list[tuple[float, float]],
        asks: list[tuple[float, float]],
        update_id: int = 0
    ) -> None:
        if update_id <= self._last_update_id:
            return

        if update_id > self._last_update_id + 1:
            self._resync_needed = True

        self._bids.clear()
        self._asks.clear()

        for price, qty in bids:
            if qty > 0:
                self._bids.add((price, qty))

        for price, qty in asks:
            if qty > 0:
                self._asks.add((price, qty))

        self._last_update_id = update_id
        self._resync_needed = False

    def apply_delta(
        self,
        side: str,
        price: float,
        qty: float,
        update_id: int = 0
    ) -> bool:
        if update_id <= self._last_update_id:
            return False

        if update_id > self._last_update_id + 1:
            self._resync_needed = True
            return False

        if qty == 0:
            idx = self._find_level(side, price)
            if idx >= 0:
                if side == "bid":
                    self._bids.pop(idx)
                else:
                    self._asks.pop(idx)
        else:
            idx = self._find_level(side, price)
            if idx >= 0:
                if side == "bid":
                    self._bids.pop(idx)
                else:
                    self._asks.pop(idx)
            if side == "bid":
                self._bids.add((price, qty))
            else:
                self._asks.add((price, qty))

        self._last_update_id = update_id
        return True

    @property
    def best_bid(self) -> Optional[float]:
        if not self._bids:
            return None
        return self._bids[0][0]

    @property
    def best_ask(self) -> Optional[float]:
        if not self._asks:
            return None
        return self._asks[0][0]

    @property
    def mid_price(self) -> Optional[float]:
        if self.best_bid is None or self.best_ask is None:
            return None
        return (self.best_bid + self.best_ask) / 2

    @property
    def spread(self) -> Optional[float]:
        if self.best_bid is None or self.best_ask is None:
            return None
        return self.best_ask - self.best_bid

    def top_n_bids(self, n: int = 5) -> list[tuple[float, float]]:
        return [(p, q) for p, q in self._bids[:n]]

    def top_n_asks(self, n: int = 5) -> list[tuple[float, float]]:
        return [(p, q) for p, q in self._asks[:n]]

    def _pressure_sum(self, side: str, n: int = 5) -> float:
        collection = self._bids if side == "bid" else self._asks
        total = 0.0
        for i in range(min(n, len(collection))):
            total += collection[i][1]
        return total

    def bid_pressure(self, n: int = 5) -> float:
        return self._pressure_sum("bid", n)

    def ask_pressure(self, n: int = 5) -> float:
        return self._pressure_sum("ask", n)

    @property
    def depth_imbalance(self) -> Optional[float]:
        bp = self.bid_pressure()
        ap = self.ask_pressure()
        if bp + ap == 0:
            return None
        return (bp - ap) / (bp + ap)

    @property
    def weighted_mid_price(self) -> Optional[float]:
        if self.best_bid is None or self.best_ask is None:
            return None
        bid_depth = self.bid_pressure()
        ask_depth = self.ask_pressure()
        if bid_depth + ask_depth == 0:
            return None
        return (self.best_ask * bid_depth + self.best_bid * ask_depth) / (bid_depth + ask_depth)