from collections import deque
from typing import Any, Optional

from modules.microstructure.order_book import OrderBook


class MicrostructureFeatures:
    def __init__(
        self,
        symbol: str,
        ofi_n: int = 10,
        bucket_size: float = 1_000_000,
        vpin_window: int = 50
    ):
        self.symbol = symbol
        self.ofi_n = ofi_n
        self.bucket_size = bucket_size
        self.vpin_window = vpin_window

        self._prev_bid_qty: dict[float, float] = {}
        self._prev_ask_qty: dict[float, float] = {}

        self._ofi_history: deque = deque(maxlen=10)
        self._vpins: deque = deque(maxlen=vpin_window)

        self._bucket_buy: float = 0.0
        self._bucket_sell: float = 0.0

        self._cvd: float = 0.0

        self._trade_times: deque = deque(maxlen=1000)

        self._vwap_num: float = 0.0
        self._vwap_denom: float = 0.0
        self._trade_count: int = 0

        self._last_mid_price: Optional[float] = None

        self.ofi: float = 0.0
        self.ofi_ma_10: float = 0.0
        self.vpin: float = 0.0
        self.cvd: float = 0.0
        self.trade_intensity: float = 0.0
        self.vwap: float = 0.0
        self.vwap_deviation: float = 0.0

    def update_from_book(
        self,
        orderbook: "OrderBook",
        prev_levels: Optional[dict[str, dict[float, float]]] = None
    ) -> None:
        if prev_levels is None:
            prev_levels = {"bid": {}, "ask": {}}

        prev_bid = prev_levels.get("bid", {})
        prev_ask = prev_levels.get("ask", {})

        current_bid = {p: q for p, q in orderbook.bids[:self.ofi_n]}
        current_ask = {p: q for p, q in orderbook.asks[:self.ofi_n]}

        delta_bid = 0.0
        for price, qty in current_bid.items():
            prev_qty = prev_bid.get(price, 0.0)
            if qty != prev_qty:
                delta_bid += qty - prev_qty
                self._prev_bid_qty[price] = qty

        for price in list(self._prev_bid_qty.keys()):
            if price not in current_bid:
                delta_bid -= self._prev_bid_qty.pop(price)

        delta_ask = 0.0
        for price, qty in current_ask.items():
            prev_qty = prev_ask.get(price, 0.0)
            if qty != prev_qty:
                delta_ask += qty - prev_qty
                self._prev_ask_qty[price] = qty

        for price in list(self._prev_ask_qty.keys()):
            if price not in current_ask:
                delta_ask -= self._prev_ask_qty.pop(price)

        self.ofi = delta_bid - delta_ask
        self._ofi_history.append(self.ofi)

        if len(self._ofi_history) >= 10:
            self.ofi_ma_10 = sum(self._ofi_history) / 10
        else:
            self.ofi_ma_10 = sum(self._ofi_history) / len(self._ofi_history) if self._ofi_history else 0.0

    def update_from_trade(
        self,
        price: float,
        qty: float,
        is_buyer_maker: bool,
        timestamp: int
    ) -> None:
        notional = price * qty

        if is_buyer_maker:
            self._bucket_sell += notional
        else:
            self._bucket_buy += notional

        if self._bucket_buy + self._bucket_sell >= self.bucket_size:
            imbalance = abs(self._bucket_buy - self._bucket_sell) / self.bucket_size
            self._vpins.append(imbalance)
            self._bucket_buy = 0.0
            self._bucket_sell = 0.0

        if len(self._vpins) >= self.vpin_window:
            self.vpin = sum(self._vpins) / self.vpin_window
        else:
            self.vpin = sum(self._vpins) / len(self._vpins) if self._vpins else 0.0

        signed_qty = -qty if is_buyer_maker else qty
        self._cvd += signed_qty
        self.cvd = self._cvd

        self._trade_times.append(timestamp)

        self._trade_count += 1
        if self._trade_count >= 1000:
            self._vwap_num = 0.0
            self._vwap_denom = 0.0
            self._trade_count = 0

        self._vwap_num += price * qty
        self._vwap_denom += qty

        if self._vwap_denom > 0:
            self.vwap = self._vwap_num / self._vwap_denom
        else:
            self.vwap = 0.0

    def compute_trade_intensity(self, now: int) -> float:
        if not self._trade_times:
            return 0.0

        cutoff = now - 10_000
        count = sum(1 for t in self._trade_times if t >= cutoff)
        self.trade_intensity = count / 10.0
        return self.trade_intensity

    def compute_vwap_deviation(self, mid_price: Optional[float]) -> Optional[float]:
        if self.vwap == 0 or mid_price is None:
            return None
        self._last_mid_price = mid_price
        self.vwap_deviation = (mid_price - self.vwap) / self.vwap
        return self.vwap_deviation

    def to_dict(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "ofi": self.ofi,
            "ofi_ma_10": self.ofi_ma_10,
            "vpin": self.vpin,
            "cvd": self.cvd,
            "trade_intensity": self.trade_intensity,
            "vwap": self.vwap,
            "vwap_deviation": self.vwap_deviation,
        }

    def reset(self) -> None:
        self._prev_bid_qty.clear()
        self._prev_ask_qty.clear()
        self._ofi_history.clear()
        self._vpins.clear()
        self._bucket_buy = 0.0
        self._bucket_sell = 0.0
        self._cvd = 0.0
        self._trade_times.clear()
        self._vwap_num = 0.0
        self._vwap_denom = 0.0
        self._trade_count = 0
        self._last_mid_price = None

        self.ofi = 0.0
        self.ofi_ma_10 = 0.0
        self.vpin = 0.0
        self.cvd = 0.0
        self.trade_intensity = 0.0
        self.vwap = 0.0
        self.vwap_deviation = 0.0