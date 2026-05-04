from collections import deque
from typing import Any, Optional

import numpy as np


class TradeFlowAnalyzer:
    def __init__(
        self,
        symbol: str,
        kyle_window: int = 200,
        gm_window: int = 100,
        gm_delay_ms: int = 10_000
    ):
        self.symbol = symbol
        self.kyle_window = kyle_window
        self.gm_window = gm_window
        self.gm_delay_ms = gm_delay_ms

        self._kyle_history: deque = deque(maxlen=kyle_window)

        self._gm_trades: deque = deque(maxlen=gm_window)

        self._last_mid_price: Optional[float] = None

        self.kyle_lambda: Optional[float] = None
        self.adverse_selection_pct: float = 0.5

    def update(
        self,
        price: float,
        qty: float,
        is_buyer_maker: bool,
        timestamp: int,
        mid_price: Optional[float] = None
    ) -> None:
        signed_volume = qty if not is_buyer_maker else -qty

        if mid_price is not None and self._last_mid_price is not None:
            delta_mid_price = mid_price - self._last_mid_price
            self._kyle_history.append((signed_volume, delta_mid_price))

            if len(self._kyle_history) >= 20:
                self._compute_kyle_lambda()
            else:
                self.kyle_lambda = None

        self._last_mid_price = mid_price

        self._gm_trades.append({
            "direction": "buy" if not is_buyer_maker else "sell",
            "price_at_trade": price,
            "timestamp": timestamp,
            "resolved": False
        })

        self._resolve_gm_trades(mid_price, timestamp)

    def _compute_kyle_lambda(self) -> None:
        if len(self._kyle_history) < 20:
            self.kyle_lambda = None
            return

        signed_vols = np.array([s for s, _ in self._kyle_history])
        delta_prices = np.array([d for _, d in self._kyle_history])

        if np.var(signed_vols) == 0:
            self.kyle_lambda = None
            return

        slope, _ = np.polyfit(signed_vols, delta_prices, 1)
        self.kyle_lambda = slope

    def _resolve_gm_trades(
        self,
        current_mid_price: Optional[float],
        now: int
    ) -> None:
        if current_mid_price is None:
            return

        cutoff = now - self.gm_delay_ms
        resolved = 0
        informed = 0

        for trade in self._gm_trades:
            if trade["timestamp"] < cutoff and not trade["resolved"]:
                trade["resolved"] = True
                resolved += 1

                direction = trade["direction"]
                price_at_trade = trade["price_at_trade"]

                if direction == "buy" and current_mid_price > price_at_trade:
                    informed += 1
                elif direction == "sell" and current_mid_price < price_at_trade:
                    informed += 1

        if resolved > 0:
            self.adverse_selection_pct = informed / resolved

    def get_kyle_lambda(self) -> Optional[float]:
        return self.kyle_lambda

    def get_adverse_selection_pct(self) -> float:
        return self.adverse_selection_pct

    def to_dict(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "kyle_lambda": float(self.kyle_lambda) if self.kyle_lambda is not None else None,
            "adverse_selection_pct": float(self.adverse_selection_pct),
        }

    def reset(self) -> None:
        self._kyle_history.clear()
        self._gm_trades.clear()
        self._last_mid_price = None
        self.kyle_lambda = None
        self.adverse_selection_pct = 0.5