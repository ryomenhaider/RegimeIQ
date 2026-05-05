"""Sentiment analysis extractors using robust z-score and velocity computation.

RobustZScore uses MAD (Median Absolute Deviation) instead of standard deviation,
making it resistant to outliers in social media sentiment data.

SentimentVelocity tracks sentiment changes over time to detect momentum shifts.
"""

from collections import deque
from dataclasses import dataclass

import numpy as np

from core.constants import MAD_SCALAR


@dataclass
class SentimentPoint:
    """A sentiment data point with score and timestamp."""
    score: float
    timestamp: int


class RobustZScore:
    """Robust z-score using MAD (Median Absolute Deviation).

    MAD-based z-score is resistant to outliers, making it suitable for
    noisy social media sentiment data where spam or coordinated campaigns
    can skew standard z-scores.

    Attributes:
        source_key: Unique identifier for the data source (e.g., "reddit:bitcoin")
        window: Rolling window size for baseline computation (default 30)
        threshold: Z-score threshold for spike detection (default 2.5)
    """

    def __init__(self, source_key: str, window: int = 30, threshold: float = 2.5) -> None:
        self.source_key = source_key
        self.window = window
        self.threshold = threshold
        self._history: deque = deque(maxlen=window)
        self._last_z_score: float = 0.0

    def update(self, value: float) -> float:
        """Update with new value and compute robust z-score.

        Args:
            value: New numeric value to compute z-score for

        Returns:
            Robust z-score: (value - median) / (1.4826 * MAD + epsilon)
            Returns 0.0 if insufficient baseline (< 3 values)
        """
        self._history.append(value)

        if len(self._history) < 3:
            self._last_z_score = 0.0
            return 0.0

        arr = np.array(self._history)
        median_x = float(np.median(arr))

        mad = float(np.median(np.abs(arr - median_x)))

        robust_z = (value - median_x) / (MAD_SCALAR * mad + 1e-8)

        self._last_z_score = float(robust_z)
        return self._last_z_score

    def is_spike(self, threshold: float | None = None) -> bool:
        """Check if last z-score exceeds threshold.

        Args:
            threshold: Override default threshold. Uses instance threshold if None.

        Returns:
            True if |last_z_score| > threshold
        """
        thresh = threshold if threshold is not None else self.threshold
        return abs(self._last_z_score) > thresh

    def reset(self) -> None:
        """Reset rolling history for fresh start."""
        self._history.clear()
        self._last_z_score = 0.0


class SentimentVelocity:
    """Tracks sentiment velocity over time.

    Velocity measures the rate of change in sentiment scores over a window
    of periods. Combined with robust z-score, it detects both absolute
    spikes and momentum shifts in sentiment.

    Attributes:
        source_key: Unique identifier for the data source
        window: Number of periods for velocity computation (default 3)
    """

    def __init__(self, source_key: str, window: int = 3) -> None:
        self.source_key = source_key
        self.window = window
        self._history: deque = deque(maxlen=50)
        self._robust_scorer = RobustZScore(source_key=f"{source_key}_velocity", window=30)

    def update(self, score: float, timestamp: int) -> tuple[float, float]:
        """Update with new sentiment score and compute velocity.

        Args:
            score: Raw sentiment score (e.g., from sentiment analysis)
            timestamp: Unix timestamp in milliseconds

        Returns:
            Tuple of (velocity, velocity_z):
                - velocity: (current_score - historical_score) / window
                - velocity_z: robust z-score of the velocity
        """
        self._history.append(SentimentPoint(score=score, timestamp=timestamp))

        if len(self._history) < self.window + 1:
            return 0.0, 0.0

        current = self._history[-1].score
        historical = self._history[-self.window - 1].score

        velocity = (current - historical) / self.window

        velocity_z = self._robust_scorer.update(velocity)

        return velocity, velocity_z

    def is_ready(self) -> bool:
        """Check if sufficient history for velocity computation.

        Returns:
            True if history has >= window + 1 observations
        """
        return len(self._history) >= self.window + 1

    def reset(self) -> None:
        """Reset all state for fresh start."""
        self._history.clear()
        self._robust_scorer.reset()