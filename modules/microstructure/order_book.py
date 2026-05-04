from sortedcontainers import SortedList
from typing import Optional


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