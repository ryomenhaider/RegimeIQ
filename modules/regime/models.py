"""Regime data models for HMM-based regime detection."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from core.enums import Tier


REGIME_LABELS = {
    0: "trending",
    1: "mean_reverting",
    2: "volatile",
    3: "illiquid"
}

REGIME_VALUES = {"trending", "mean_reverting", "volatile", "illiquid"}


@dataclass
class RegimeOutput:
    """Output from regime detection inference.

    Attributes:
        regime: Current regime label ("trending", "mean_reverting", "volatile", "illiquid")
        confidence: Max posterior probability, range 0.0 to 1.0
        transition_probs: Dict mapping regime labels to transition probabilities
        time_in_regime: Seconds since last regime change
        model_tier: Model tier ("dedicated", "high", "mid", "low")
        trained_at: UTC datetime of last model training
        model_reliable: False if insufficient observations (<1000) or model not loaded
        symbol: Trading symbol (e.g., "BTCUSDT")
        timestamp: UTC datetime of this prediction
    """

    regime: str
    confidence: float
    transition_probs: dict[str, float]
    time_in_regime: int
    model_tier: str
    trained_at: datetime
    model_reliable: bool
    symbol: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        """Validate fields after initialization."""
        if self.regime not in REGIME_VALUES:
            raise ValueError(f"Invalid regime: {self.regime}")

        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(f"Confidence must be 0.0-1.0, got {self.confidence}")

        if len(self.transition_probs) != 4:
            missing = set(REGIME_LABELS.values()) - set(self.transition_probs.keys())
            raise ValueError(f"transition_probs missing: {missing}")

        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)

        if self.trained_at.tzinfo is None:
            self.trained_at = self.trained_at.replace(tzinfo=timezone.utc)

    def to_dict(self) -> dict:
        """Convert to JSON-serializable dict matching WS message format.

        Returns:
            Dict with ISO8601 datetime strings and all required fields.
        """
        return {
            "regime": self.regime,
            "confidence": self.confidence,
            "transition_probs": self.transition_probs,
            "time_in_regime": self.time_in_regime,
            "model_tier": self.model_tier,
            "trained_at": self.trained_at.isoformat(),
            "model_reliable": self.model_reliable,
            "symbol": self.symbol,
            "timestamp": self.timestamp.isoformat()
        }

    def is_actionable(self) -> bool:
        """Check if this regime prediction is actionable for trading.

        Returns True only if:
            - model_reliable is True
            - confidence >= 0.5
            - regime is NOT "illiquid"

        Returns:
            True if the regime signal is actionable, False otherwise.
        """
        if not self.model_reliable:
            return False

        if self.confidence < 0.5:
            return False

        if self.regime == "illiquid":
            return False

        return True

    def dominant_transition(self) -> Optional[str]:
        """Get the most likely next regime if transition probability exceeds threshold.

        Examines transition probabilities (excluding current regime) and returns
        the label of the regime with highest transition probability if it exceeds
        0.2, otherwise returns None.

        Returns:
            Label of most likely next regime if any transition_prob > 0.2,
            else None.
        """
        current_regime = self.regime

        other_probs = {
            label: prob
            for label, prob in self.transition_probs.items()
            if label != current_regime
        }

        if not other_probs:
            return None

        max_prob = max(other_probs.values())
        if max_prob <= 0.2:
            return None

        return max(other_probs, key=other_probs.get)

    def __repr__(self) -> str:
        """Readable representation for logging."""
        return (
            f"RegimeOutput("
            f"symbol={self.symbol}, "
            f"regime={self.regime}, "
            f"confidence={self.confidence:.3f}, "
            f"model_reliable={self.model_reliable}, "
            f"time_in_regime={self.time_in_regime}s)"
        )


def tier_to_string(tier: Tier) -> str:
    """Convert Tier enum to string for RegimeOutput.

    Args:
        tier: Tier enum value

    Returns:
        String representation of tier
    """
    return tier.value if hasattr(tier, 'value') else str(tier)


def create_from_hmm_output(
    regime: str,
    confidence: float,
    hmm_transition_probs: list[float],
    time_in_regime: int,
    hmm: Any,
    symbol: str,
    timestamp: Optional[datetime] = None
) -> "RegimeOutput":
    """Factory function to create RegimeOutput from HMM inference results.

    Args:
        regime: Regime label from HMM
        confidence: Max posterior probability
        hmm_transition_probs: List of 4 transition probabilities from HMM
        time_in_regime: Seconds since regime change
        hmm: RegimeModel instance with tier and trained_at attributes
        symbol: Trading symbol
        timestamp: Optional timestamp, defaults to now

    Returns:
        RegimeOutput instance
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    transition_probs = {
        REGIME_LABELS[i]: hmm_transition_probs[i]
        for i in range(4)
    }

    model_tier = getattr(hmm, 'tier', 'low')
    trained_at = getattr(hmm, 'trained_at', datetime.now(timezone.utc))
    model_reliable = hmm.is_reliable() if hasattr(hmm, 'is_reliable') else False

    return RegimeOutput(
        regime=regime,
        confidence=confidence,
        transition_probs=transition_probs,
        time_in_regime=time_in_regime,
        model_tier=model_tier,
        trained_at=trained_at,
        model_reliable=model_reliable,
        symbol=symbol,
        timestamp=timestamp
    )