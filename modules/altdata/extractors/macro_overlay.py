"""Macro regime overlay from FRED economic data.

Classifies macro environment as risk_on / risk_off / neutral using:
- Yield curve (10Y - 2Y spread)
- CPI year-over-year (inflation)
- Fed funds rate (monetary policy)

Combined with velocity-adjusted signal strength.
"""

from collections import deque
from datetime import datetime
from math import tanh

from modules.altdata.extractors.sentiment import SentimentVelocity
from modules.altdata.models import MacroSignal


class MacroOverlay:
    """Classifies macro environment from FRED economic data.

    Uses yield curve, inflation, and fed funds rate to determine
    risk-on/risk-off regime with velocity-adjusted signal.

    Attributes:
        window: Rolling window for yield_curve min/max (default 30)
    """

    def __init__(self, window: int = 30) -> None:
        self._yield_history: deque = deque(maxlen=window)
        self._fed_velocity = SentimentVelocity("fed_funds_rate", window=3)
        self._last_signal: MacroSignal | None = None

    def update(
        self,
        yield_curve: float,
        cpi_yoy: float,
        fed_funds_rate: float,
        prev_cpi: float,
        prev_fed_funds: float,
        timestamp: int | None = None
    ) -> MacroSignal:
        """Update with FRED data and classify macro regime.

        Args:
            yield_curve: 10Y - 2Y yield spread (positive = normal, negative = inverted)
            cpi_yoy: CPI year-over-year inflation rate
            fed_funds_rate: Federal funds rate
            prev_cpi: Previous period CPI (for comparison)
            prev_fed_funds: Previous period fed funds rate (for comparison)
            timestamp: Optional Unix timestamp (ms), defaults to now

        Returns:
            MacroSignal with regime, score, confidence, signal_s
        """
        self._yield_history.append(yield_curve)

        regime = self._classify(
            yield_curve, cpi_yoy, fed_funds_rate, prev_cpi, prev_fed_funds
        )

        direction = {"risk_on": 1, "risk_off": -1, "neutral": 0}.get(regime, 0)

        score = {"risk_on": 0.5, "risk_off": -0.5, "neutral": 0.0}.get(regime, 0.0)

        confidence = self._compute_confidence(yield_curve)

        velocity, velocity_z = self._fed_velocity.update(fed_funds_rate, timestamp or 0)

        signal_s = tanh(velocity_z * direction) if direction != 0 else 0.0

        ts = datetime.utcnow().isoformat() + "Z" if timestamp is None else datetime.utcfromtimestamp(timestamp / 1000).isoformat() + "Z"

        self._last_signal = MacroSignal(
            regime=regime,
            score=score,
            confidence=confidence,
            signal_s=signal_s,
            yield_curve=yield_curve,
            cpi_yoy=cpi_yoy,
            fed_funds_rate=fed_funds_rate,
            timestamp=ts
        )

        return self._last_signal

    def _classify(
        self,
        yield_curve: float,
        cpi_yoy: float,
        fed_funds_rate: float,
        prev_cpi: float,
        prev_fed_funds: float
    ) -> str:
        """Classify macro regime (first match wins)."""
        if yield_curve > 0 and cpi_yoy < prev_cpi:
            return "risk_on"
        if yield_curve < 0 or fed_funds_rate > prev_fed_funds:
            return "risk_off"
        return "neutral"

    def _compute_confidence(self, yield_curve: float) -> float:
        """Compute confidence from yield curve extremity."""
        if len(self._yield_history) < 2:
            return 0.0

        arr = list(self._yield_history)
        min_yc = min(arr)
        max_yc = max(arr)
        range_yc = max_yc - min_yc

        if range_yc == 0:
            return 0.0

        normalized = abs(yield_curve - min_yc) / range_yc
        return max(0.0, min(1.0, normalized))

    def reset(self) -> None:
        """Reset all state for fresh start."""
        self._yield_history.clear()
        self._fed_velocity.reset()
        self._last_signal = None