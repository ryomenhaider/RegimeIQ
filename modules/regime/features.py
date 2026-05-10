from collections import deque
from dataclasses import dataclass

import numpy as np


@dataclass
class MicrostructureOutput:
    """Subset of microstructure fields needed for regime feature computation."""
    symbol: str = ""
    timestamp: int = 0
    ofi: float = 0.0
    ofi_ma_10: float = 0.0
    vpin: float = 0.0
    kyle_lambda: float | None = None
    spread: float | None = None
    mid_price: float | None = None
    bid_pressure: float = 0.0
    ask_pressure: float = 0.0


class RegimeFeatures:

    EPSILON = 1e-8
    MIN_OBS = 50

    def __init__(self) -> None:
        self._mid_price_history: deque = deque(maxlen=self.MIN_OBS)
        self._ofi_history: deque = deque(maxlen=500)
        self._vol_history: deque = deque(maxlen=500)
        self._trend_history: deque = deque(maxlen=500)
        self._liq_history: deque = deque(maxlen=500)
        self._vpin_history: deque = deque(maxlen=500)
        self._ofi_z_history: deque = deque(maxlen=500)

    def is_ready(self) -> bool:
        return len(self._mid_price_history) >= self.MIN_OBS

    def _compute_volatility(self) -> float:
        """volatility = std(mid_price) / mean(mid_price) over 50 ticks."""
        if len(self._mid_price_history) < 2:
            return 0.0
        arr = np.array(self._mid_price_history)
        mean_val = float(np.mean(arr))
        if mean_val == 0:
            return 0.0
        return float(np.std(arr)) / mean_val

    def _compute_trend_strength(
        self,
        ofi_ma_10: float,
        bid_pressure: float,
        ask_pressure: float
    ) -> float:
        """trend_strength = |ofi_ma_10| / (bid_pressure + ask_pressure)."""
        denominator = bid_pressure + ask_pressure
        if denominator == 0:
            return 0.0
        return abs(ofi_ma_10) / denominator

    def _compute_liquidity_score(
        self,
        kyle_lambda: float | None,
        spread: float | None
    ) -> float:
        """liquidity_score = 1 / (kyle_lambda * spread)."""
        if kyle_lambda is None or spread is None:
            return 0.0
        product = kyle_lambda * spread
        if product == 0:
            return 0.0
        return 1.0 / product

    def _compute_ofi_z(self, ofi: float) -> float:
        """ofi_z = (ofi - rolling_mean_ofi) / rolling_std_ofi."""
        if len(self._ofi_history) < 2:
            return 0.0
        arr = np.array(self._ofi_history)
        mean_val = float(np.mean(arr))
        std_val = float(np.std(arr))
        if std_val == 0:
            return 0.0
        return (ofi - mean_val) / std_val

    def _rolling_mean_std(
        self,
        history: deque
    ) -> tuple[float, float]:
        """Compute rolling mean and std from history deque."""
        if len(history) < 2:
            return 0.0, self.EPSILON
        arr = np.array(history)
        mean_val = float(np.mean(arr))
        std_val = float(np.std(arr))
        if std_val == 0:
            std_val = self.EPSILON
        return mean_val, std_val

    def _normalize(
        self,
        value: float,
        mean: float,
        std: float
    ) -> float:
        """Normalize value using mean and std with epsilon guard."""
        return (value - mean) / (std + self.EPSILON)

    def update(self, microstructure_output: MicrostructureOutput) -> np.ndarray:

        mid_price = microstructure_output.mid_price
        ofi = microstructure_output.ofi
        ofi_ma_10 = microstructure_output.ofi_ma_10
        bid_pressure = microstructure_output.bid_pressure
        ask_pressure = microstructure_output.ask_pressure
        kyle_lambda = microstructure_output.kyle_lambda
        spread = microstructure_output.spread
        vpin = microstructure_output.vpin

        if mid_price is not None:
            self._mid_price_history.append(mid_price)

        self._ofi_history.append(ofi)

        raw_volatility = self._compute_volatility()
        raw_trend = self._compute_trend_strength(ofi_ma_10, bid_pressure, ask_pressure)
        raw_liquidity = self._compute_liquidity_score(kyle_lambda, spread)
        raw_vpin = vpin
        raw_ofi_z = self._compute_ofi_z(ofi)

        self._vol_history.append(raw_volatility)
        self._trend_history.append(raw_trend)
        self._liq_history.append(raw_liquidity)
        self._vpin_history.append(raw_vpin)
        self._ofi_z_history.append(raw_ofi_z)

        vol_mean, vol_std = self._rolling_mean_std(self._vol_history)
        trend_mean, trend_std = self._rolling_mean_std(self._trend_history)
        liq_mean, liq_std = self._rolling_mean_std(self._liq_history)
        vpin_mean, vpin_std = self._rolling_mean_std(self._vpin_history)
        ofi_z_mean, ofi_z_std = self._rolling_mean_std(self._ofi_z_history)

        feature_volatility = self._normalize(raw_volatility, vol_mean, vol_std)
        feature_trend = self._normalize(raw_trend, trend_mean, trend_std)
        feature_liquidity = self._normalize(raw_liquidity, liq_mean, liq_std)
        feature_vpin = self._normalize(raw_vpin, vpin_mean, vpin_std)
        feature_ofi_z = self._normalize(raw_ofi_z, ofi_z_mean, ofi_z_std)

        return np.array([
            feature_volatility,
            feature_trend,
            feature_liquidity,
            feature_vpin,
            feature_ofi_z
        ], dtype=np.float64)

    def reset(self) -> None:
        """Reset rolling history for fresh start."""
        self._mid_price_history.clear()
        self._ofi_history.clear()
        self._vol_history.clear()
        self._trend_history.clear()
        self._liq_history.clear()
        self._vpin_history.clear()
        self._ofi_z_history.clear()