from collections import deque
from dataclasses import dataclass
from typing import Any, Optional

from core.config import config


@dataclass
class SpreadDecomposer:
    symbol: str
    outcome_window_ms: int = 10_000
    window_size: int = 200

    _trades: deque = None
    _spread: float = 0.0

    def __post_init__(self):
        window_size = config.get("spread_window", self.window_size)
        outcome_window = config.get("outcome_delay_ms", self.outcome_window_ms)
        self._trades = deque(maxlen=window_size)
        self.outcome_window_ms = outcome_window
        self.window_size = window_size

    def update(
        self,
        trades: list[dict],
        spread: float,
        mid_price: float
    ) -> dict[str, Any]:
        self._spread = spread
        for trade in trades:
            self._trades.append({
                "direction": trade.get("direction", "buy"),
                "price_at_trade": trade.get("price", mid_price),
                "timestamp": trade.get("timestamp", 0),
                "resolved": False
            })

        return self._analyze_outcomes(mid_price)

    def _analyze_outcomes(self, current_mid_price: float) -> dict[str, Any]:
        cutoff = self._get_cutoff_timestamp()
        informed_count = 0
        resolved_count = 0

        for trade in self._trades:
            if trade["resolved"]:
                continue
            if trade["timestamp"] < cutoff:
                trade["resolved"] = True
                resolved_count += 1
                direction = trade["direction"]
                price_at_trade = trade["price_at_trade"]

                if direction == "buy" and current_mid_price > price_at_trade:
                    informed_count += 1
                elif direction == "sell" and current_mid_price < price_at_trade:
                    informed_count += 1

        adverse_selection_pct = (
            informed_count / resolved_count if resolved_count > 0 else 0.0
        )
        adverse_selection_component = adverse_selection_pct * self._spread

        return {
            "symbol": self.symbol,
            "spread": self._spread,
            "adverse_selection_pct": adverse_selection_pct,
            "adverse_selection_component": adverse_selection_component,
            "total_trades_in_window": len(self._trades),
            "resolved_trades": resolved_count,
        }

    def _get_cutoff_timestamp(self) -> int:
        import time
        return int(time.time() * 1000) - self.outcome_window_ms

    def get_spread(self) -> float:
        return self._spread

    def to_dict(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "spread": self._spread,
        }