"""Regime feature engineering for HMM-based regime detection.

This module builds 5-dimensional feature vectors from raw microstructure data
for classification into market regimes (trending, mean-reverting, volatile, illiquid).
"""

from collections import deque
from typing import Optional, Any

import numpy as np


class RegimeFeatures:
    """Builds a 5-dimensional feature vector from microstructure data.

    Features:
        - volatility: rolling std/mean of mid_price (50 ticks)
        - trend_strength: |ofi_ma_10| / (bid_pressure + ask_pressure)
        - liquidity_score: 1 / (kyle_lambda * spread)
        - vpin: current VPIN value
        - ofi_z: z-score of current OFI relative to rolling mean

    Input:
        microstructure_obj with fields: mid_price, ofi, ofi_ma_10,
        bid_pressure, ask_pressure, kyle_lambda, spread, vpin

    Output:
        numpy array of shape (5,) with normalized features
    """

    def __init__(
        self,
        mean_vec: Optional[np.ndarray] = None,
        std_vec: Optional[np.ndarray] = None
    ) -> None:
        """Initialize RegimeFeatures with optional normalization vectors.

        Args:
            mean_vec: Optional mean vector for normalization (shape (5,))
            std_vec: Optional std vector for normalization (shape (5,))
        """
        self._mid_price_history: deque = deque(maxlen=50)
        self._ofi_history: deque = deque(maxlen=50)

        self._mean_vec = mean_vec
        self._std_vec = std_vec

    def update(self, microstructure_obj: Any) -> None:
        """Update rolling history with new microstructure data point.

        Args:
            microstructure_obj: Object with mid_price and ofi attributes.
                Expected attributes: mid_price (float), ofi (float)
        """
        mid_price = getattr(microstructure_obj, 'mid_price', None)
        ofi = getattr(microstructure_obj, 'ofi', 0.0)

        if mid_price is not None:
            self._mid_price_history.append(mid_price)

        self._ofi_history.append(ofi)

    def _compute_volatility(self) -> float:
        """Compute volatility as std(mid_price) / mean(mid_price).

        Uses rolling 50-tick window. Returns 0.0 if insufficient data
        or mean is zero.

        Returns:
            Volatility coefficient (dimensionless)
        """
        if len(self._mid_price_history) < 2:
            return 0.0

        arr = np.array(self._mid_price_history)
        mean_val = np.mean(arr)

        if mean_val == 0:
            return 0.0

        return np.std(arr) / mean_val

    def _compute_trend_strength(
        self,
        ofi_ma_10: float,
        bid_pressure: float,
        ask_pressure: float
    ) -> float:
        """Compute trend strength as |ofi_ma_10| / (bid_pressure + ask_pressure).

        Args:
            ofi_ma_10: 10-period OFI moving average
            bid_pressure: Bid side pressure (sum of top N quantities)
            ask_pressure: Ask side pressure (sum of top N quantities)

        Returns:
            Trend strength coefficient (dimensionless)
        """
        denominator = bid_pressure + ask_pressure

        if denominator == 0:
            return 0.0

        return abs(ofi_ma_10) / denominator

    def _compute_liquidity_score(
        self,
        kyle_lambda: Optional[float],
        spread: Optional[float]
    ) -> float:
        """Compute liquidity score as 1 / (kyle_lambda * spread).

        Args:
            kyle_lambda: Kyle's Lambda price impact coefficient
            spread: Bid-ask spread

        Returns:
            Liquidity score (higher = more liquid)
        """
        if kyle_lambda is None or spread is None:
            return 0.0

        product = kyle_lambda * spread

        if product == 0:
            return 0.0

        return 1.0 / product

    def _compute_ofi_z(self, ofi: float) -> float:
        """Compute OFI z-score relative to rolling mean and std.

        Uses rolling 50-tick window. Returns 0.0 if insufficient data
        or std is zero.

        Args:
            ofi: Current Order Flow Imbalance value

        Returns:
            Z-score of current OFI
        """
        if len(self._ofi_history) < 2:
            return 0.0

        arr = np.array(self._ofi_history)
        mean_val = np.mean(arr)
        std_val = np.std(arr)

        if std_val == 0:
            return 0.0

        return (ofi - mean_val) / std_val

    def compute(self) -> np.ndarray:
        """Compute raw 5-dimensional feature vector.

        Returns:
            numpy array of shape (5,) with features:
                [volatility, trend_strength, liquidity_score, vpin, ofi_z]
        """
        features = np.zeros(5, dtype=np.float64)

        features[0] = self._compute_volatility()

        return features

    def compute_with_inputs(
        self,
        ofi_ma_10: float,
        bid_pressure: float,
        ask_pressure: float,
        kyle_lambda: Optional[float],
        spread: Optional[float],
        vpin: float,
        ofi: float
    ) -> np.ndarray:
        """Compute raw 5-dimensional feature vector with explicit inputs.

        This method computes all features at once using provided values,
        suitable for use cases where the microstructure object isn't available.

        Args:
            ofi_ma_10: 10-period OFI moving average
            bid_pressure: Bid side pressure
            ask_pressure: Ask side pressure
            kyle_lambda: Kyle's Lambda
            spread: Bid-ask spread
            vpin: Current VPIN value
            ofi: Current OFI value

        Returns:
            numpy array of shape (5,) with features:
                [volatility, trend_strength, liquidity_score, vpin, ofi_z]
        """
        features = np.zeros(5, dtype=np.float64)

        features[0] = self._compute_volatility()
        features[1] = self._compute_trend_strength(
            ofi_ma_10, bid_pressure, ask_pressure
        )
        features[2] = self._compute_liquidity_score(kyle_lambda, spread)
        features[3] = vpin
        features[4] = self._compute_ofi_z(ofi)

        return features

    def to_vector(
        self,
        ofi_ma_10: float = 0.0,
        bid_pressure: float = 0.0,
        ask_pressure: float = 0.0,
        kyle_lambda: Optional[float] = None,
        spread: Optional[float] = None,
        vpin: float = 0.0,
        ofi: float = 0.0
    ) -> np.ndarray:
        """Compute and return the final normalized feature vector.

        This is the primary public API for getting the feature vector.
        It computes all 5 features and applies normalization if mean/std
        vectors were provided at initialization.

        Args:
            ofi_ma_10: 10-period OFI moving average
            bid_pressure: Bid side pressure (sum of top N quantities)
            ask_pressure: Ask side pressure (sum of top N quantities)
            kyle_lambda: Kyle's Lambda price impact coefficient
            spread: Bid-ask spread
            vpin: Current VPIN value
            ofi: Current Order Flow Imbalance

        Returns:
            numpy array of shape (5,) with normalized features:
                [volatility, trend_strength, liquidity_score, vpin, ofi_z]
        """
        features = self.compute_with_inputs(
            ofi_ma_10=ofi_ma_10,
            bid_pressure=bid_pressure,
            ask_pressure=ask_pressure,
            kyle_lambda=kyle_lambda,
            spread=spread,
            vpin=vpin,
            ofi=ofi
        )

        if self._mean_vec is not None and self._std_vec is not None:
            mask = self._std_vec > 0
            features[mask] = (
                (features[mask] - self._mean_vec[mask]) / self._std_vec[mask]
            )

        return features

    def set_normalization(
        self,
        mean_vec: np.ndarray,
        std_vec: np.ndarray
    ) -> None:
        """Set normalization vectors for inference-time normalization.

        Args:
            mean_vec: Mean vector (shape (5,))
            std_vec: Standard deviation vector (shape (5,))
        """
        self._mean_vec = mean_vec
        self._std_vec = std_vec

    def reset(self) -> None:
        """Reset rolling history for fresh start.

        Clears mid_price and OFI history deques.
        """
        self._mid_price_history.clear()
        self._ofi_history.clear()