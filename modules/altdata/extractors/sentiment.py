
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
    def __init__(self, source_key: str, window: int = 30, threshold: float = 2.5) -> None:
        self.source_key = source_key
        self.window = window
        self.threshold = threshold
        self._history: deque = deque(maxlen=window)
        self._last_z_score: float = 0.0

    def update(self, value: float) -> float:
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
        thresh = threshold if threshold is not None else self.threshold
        return abs(self._last_z_score) > thresh

    def reset(self) -> None:
        """Reset rolling history for fresh start."""
        self._history.clear()
        self._last_z_score = 0.0


class SentimentVelocity:

    def __init__(self, source_key: str, window: int = 3) -> None:
        self.source_key = source_key
        self.window = window
        self._history: deque = deque(maxlen=50)
        self._robust_scorer = RobustZScore(source_key=f"{source_key}_velocity", window=30)

    def update(self, score: float, timestamp: int) -> tuple[float, float]:
        self._history.append(SentimentPoint(score=score, timestamp=timestamp))

        if len(self._history) < self.window + 1:
            return 0.0, 0.0

        current = self._history[-1].score
        historical = self._history[-self.window - 1].score

        velocity = (current - historical) / self.window

        velocity_z = self._robust_scorer.update(velocity)

        return velocity, velocity_z

    def is_ready(self) -> bool:
        return len(self._history) >= self.window + 1

    def reset(self) -> None:
        """Reset all state for fresh start."""
        self._history.clear()
        self._robust_scorer.reset()