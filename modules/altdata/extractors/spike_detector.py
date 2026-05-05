"""Spike detection using robust z-score.

Detects anomalous volume or search spikes in alternative data series
using MAD-based z-score for outlier resistance.
"""

from modules.altdata.extractors.sentiment import RobustZScore
from modules.altdata.models import AltDataSignalMetrics


class SpikeDetector:
    """Detects spikes in data series using robust z-score.

    One instance per data series (e.g., reddit_post_count, trends_value, onchain_volume).
    Never share instances between different series.

    Attributes:
        series_key: Unique identifier for the data series
        window: Rolling window size for baseline (default 30)
        threshold: Z-score threshold for spike detection (default 2.5)
    """

    def __init__(
        self,
        series_key: str,
        window: int = 30,
        threshold: float = 2.5
    ) -> None:
        self.series_key = series_key
        self.threshold = threshold
        self._robust_z = RobustZScore(series_key, window=window, threshold=threshold)

    def update(self, value: float) -> AltDataSignalMetrics:
        """Update with new value and check for spike.

        Args:
            value: New numeric value to check

        Returns:
            AltDataSignalMetrics with z_score, is_spike, direction
        """
        z_score = self._robust_z.update(value)

        is_spike = abs(z_score) > self.threshold
        direction = 1 if z_score > 0 else -1

        return AltDataSignalMetrics(
            z_score=z_score,
            is_spike=is_spike,
            direction=direction
        )

    def reset(self) -> None:
        """Reset rolling history for fresh start."""
        self._robust_z.reset()