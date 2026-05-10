from modules.altdata.extractors.sentiment import RobustZScore
from modules.altdata.models import AltDataSignalMetrics


class SpikeDetector:

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