"""RegimeTrainer - Offline ML training pipeline for HMM regime detection.

Handles fetching historical data, building feature matrices, walk-forward
validation, model training, and persistence.
"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd
from hmmlearn.hmm import GaussianHMM
import joblib

from modules.regime.features import RegimeFeatures
from core.state import RegimeModel
from core.enums import Tier

logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent.parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True, parents=True)

DEFAULT_MIN_OBSERVATIONS = 1000

WALK_FORWARD_TRAIN_RATIO = 0.67

HMM_DEFAULTS = {
    "n_components": 4,
    "covariance_type": "full",
    "n_iter": 100,
    "tol": 1e-4
}


class RegimeTrainer:
    """Offline ML training pipeline for HMM-based regime detection.

    Responsibilities:
        - Query TimescaleDB for historical microstructure data
        - Build feature matrix using RegimeFeatures
        - Compute and store normalization statistics
        - Run walk-forward validation (train 60 days, test 30 days)
        - Train final model on full dataset
        - Persist model and normalization stats to disk
    """

    def __init__(
        self,
        symbol: str,
        db_client: Any,
        config: dict[str, Any]
    ) -> None:
        """Initialize RegimeTrainer.

        Args:
            symbol: Trading symbol (e.g., "BTCUSDT")
            db_client: Database client instance
            config: Configuration dictionary with optional HMM params
        """
        self.symbol = symbol.upper()
        self.db_client = db_client
        self.config = config

        self._hmm_config = {
            **HMM_DEFAULTS,
            "n_components": config.get("hmm_n_components", HMM_DEFAULTS["n_components"]),
            "covariance_type": config.get("hmm_covariance_type", HMM_DEFAULTS["covariance_type"]),
            "n_iter": config.get("hmm_n_iter", HMM_DEFAULTS["n_iter"]),
            "tol": config.get("hmm_tol", HMM_DEFAULTS["tol"])
        }

        self._min_observations = config.get("min_model_observations", DEFAULT_MIN_OBSERVATIONS)

        self._norm_mean: Optional[np.ndarray] = None
        self._norm_std: Optional[np.ndarray] = None
        self._trained_at: Optional[datetime] = None
        self._n_observations: int = 0

    @property
    def _model_path(self) -> Path:
        return MODELS_DIR / f"{self.symbol.lower()}_hmm.joblib"

    @property
    def _norm_stats_path(self) -> Path:
        return MODELS_DIR / f"{self.symbol.lower()}_norm_stats.json"

    def fetch_training_data(self, days: int = 90) -> pd.DataFrame:
        """Fetch historical microstructure data from TimescaleDB.

        Args:
            days: Number of days of history to fetch (default 90)

        Returns:
            DataFrame with columns: symbol, timestamp, ofi, ofi_ma_10, vpin,
            kyle_lambda, spread, mid_price, bid_pressure, ask_pressure

        Raises:
            ValueError: If insufficient data or query fails
        """
        logger.info(f"Fetching {days} days of training data for {self.symbol}")

        cutoff_time = datetime.now(timezone.utc) - pd.Timedelta(days=days)

        query = """
            SELECT
                symbol,
                timestamp,
                ofi,
                ofi_ma_10,
                vpin,
                kyle_lambda,
                spread,
                mid_price,
                bid_pressure,
                ask_pressure
            FROM microstructure
            WHERE symbol = $1
              AND timestamp >= $2
            ORDER BY timestamp ASC
        """

        try:
            import asyncio
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        try:
            records = loop.run_until_complete(
                self.db_client.fetch(query, self.symbol, cutoff_time)
            )
        except Exception as e:
            raise ValueError(f"Failed to fetch training data: {e}")

        if not records:
            raise ValueError(f"No data found for {self.symbol} in the last {days} days")

        df = pd.DataFrame([
            {
                "symbol": r["symbol"],
                "timestamp": r["timestamp"],
                "ofi": r["ofi"] or 0.0,
                "ofi_ma_10": r["ofi_ma_10"] or 0.0,
                "vpin": r["vpin"] or 0.0,
                "kyle_lambda": r["kyle_lambda"],
                "spread": r["spread"],
                "mid_price": r["mid_price"],
                "bid_pressure": r["bid_pressure"] or 0.0,
                "ask_pressure": r["ask_pressure"] or 0.0
            }
            for r in records
        ])

        logger.info(f"Fetched {len(df)} rows of training data for {self.symbol}")

        return df

    def build_feature_matrix(
        self,
        df: pd.DataFrame,
        compute_norm: bool = True
    ) -> np.ndarray:
        """Build feature matrix from microstructure DataFrame.

        Args:
            df: DataFrame from fetch_training_data()
            compute_norm: If True, compute and store normalization stats

        Returns:
            numpy array of shape (T, 5) with normalized features

        Raises:
            ValueError: If insufficient observations (< min_model_observations)
        """
        if len(df) < self._min_observations:
            raise ValueError(
                f"Insufficient training data: {len(df)} < {self._min_observations}. "
                f"Need at least {self._min_observations} observations to train model."
            )

        logger.info(f"Building feature matrix from {len(df)} observations")

        features_extractor = RegimeFeatures()

        feature_list = []
        valid_count = 0

        for _, row in df.iterrows():
            mid_price = row.get("mid_price")
            ofi = row.get("ofi", 0.0)
            ofi_ma_10 = row.get("ofi_ma_10", 0.0)
            bid_pressure = row.get("bid_pressure", 0.0)
            ask_pressure = row.get("ask_pressure", 0.0)
            kyle_lambda = row.get("kyle_lambda")
            spread = row.get("spread")
            vpin = row.get("vpin", 0.0)

            if mid_price is not None:
                class MicrostructureObj:
                    pass

                obj = MicrostructureObj()
                obj.mid_price = mid_price
                obj.ofi = ofi

                features_extractor.update(obj)

            if len(features_extractor._mid_price_history) >= 10:
                feature_vec = features_extractor.to_vector(
                    ofi_ma_10=ofi_ma_10,
                    bid_pressure=bid_pressure,
                    ask_pressure=ask_pressure,
                    kyle_lambda=kyle_lambda,
                    spread=spread,
                    vpin=vpin,
                    ofi=ofi
                )

                if not np.any(np.isnan(feature_vec)) and not np.any(np.isinf(feature_vec)):
                    feature_list.append(feature_vec)
                    valid_count += 1

        if valid_count < self._min_observations:
            raise ValueError(
                f"Insufficient valid features: {valid_count} < {self._min_observations}"
            )

        X = np.array(feature_list, dtype=np.float64)

        logger.info(f"Built feature matrix with shape {X.shape}")

        if compute_norm:
            self._norm_mean = np.mean(X, axis=0)
            self._norm_std = np.std(X, axis=0)

            mask = self._norm_std > 0
            X_normalized = X.copy()
            X_normalized[:, mask] = (
                (X[:, mask] - self._norm_mean[mask]) / self._norm_std[mask]
            )

            logger.info(
                f"Normalization stats - mean: {self._norm_mean}, std: {self._norm_std}"
            )

            return X_normalized

        return X

    def walk_forward_validate(self, X: np.ndarray) -> dict[str, float]:
        """Run walk-forward validation on feature matrix.

        Splits data: first 60% for training, remaining 40% for testing.

        Args:
            X: Feature matrix of shape (T, 5)

        Returns:
            Dict with train_log_likelihood and test_log_likelihood

        Raises:
            ValueError: If insufficient data for validation split
        """
        n_samples = len(X)
        train_size = int(n_samples * WALK_FORWARD_TRAIN_RATIO)

        if train_size < self._min_observations:
            raise ValueError(
                f"Insufficient data for walk-forward validation: "
                f"train size {train_size} < {self._min_observations}"
            )

        X_train = X[:train_size]
        X_test = X[train_size:]

        logger.info(
            f"Walk-forward validation: train={len(X_train)}, test={len(X_test)}"
        )

        hmm_train = GaussianHMM(**self._hmm_config)
        hmm_train.fit(X_train)

        train_score = hmm_train.score(X_train)
        test_score = hmm_train.score(X_test)

        logger.info(
            f"Walk-forward results for {self.symbol}: "
            f"train_log_likelihood={train_score:.4f}, test_log_likelihood={test_score:.4f}"
        )

        return {
            "train_log_likelihood": float(train_score),
            "test_log_likelihood": float(test_score)
        }

    def train(self, days: int = 90) -> RegimeModel:
        """Run full training pipeline.

        1. Fetch training data (90 days)
        2. Build feature matrix with normalization
        3. Run walk-forward validation
        4. Train final model on full dataset
        5. Save model and normalization stats to disk
        6. Return RegimeModel instance

        Args:
            days: Number of days of history to use

        Returns:
            RegimeModel instance ready for inference

        Raises:
            ValueError: If training data insufficient or validation fails
        """
        logger.info(f"Starting full training pipeline for {self.symbol}")

        df = self.fetch_training_data(days=days)

        X = self.build_feature_matrix(df, compute_norm=True)

        validation_results = self.walk_forward_validate(X)
        logger.info(f"Validation complete: {validation_results}")

        logger.info(f"Training final HMM model on {len(X)} observations")
        final_hmm = GaussianHMM(**self._hmm_config)
        final_hmm.fit(X)

        self._trained_at = datetime.now(timezone.utc)
        self._n_observations = len(X)

        self._save_model(final_hmm)
        self._save_norm_stats()

        logger.info(
            f"Model trained and saved for {self.symbol}: "
            f"{self._n_observations} observations, trained at {self._trained_at}"
        )

        return self._create_regime_model(final_hmm)

    def _save_model(self, hmm: GaussianHMM) -> None:
        """Save trained HMM model to disk using joblib.

        Args:
            hmm: Trained GaussianHMM instance
        """
        joblib.dump(hmm, self._model_path)
        logger.info(f"Model saved to {self._model_path}")

    def _save_norm_stats(self) -> None:
        """Save normalization statistics to JSON."""
        if self._norm_mean is None or self._norm_std is None:
            raise RuntimeError("Normalization stats not computed")

        norm_stats = {
            "mean": self._norm_mean.tolist(),
            "std": self._norm_std.tolist(),
            "trained_at": self._trained_at.isoformat() if self._trained_at else None,
            "n_observations": self._n_observations,
            "symbol": self.symbol
        }

        with open(self._norm_stats_path, "w") as f:
            json.dump(norm_stats, f, indent=2)

        logger.info(f"Normalization stats saved to {self._norm_stats_path}")

    def _create_regime_model(self, hmm: GaussianHMM) -> RegimeModel:
        """Create RegimeModel instance from trained HMM.

        Args:
            hmm: Trained GaussianHMM instance

        Returns:
            RegimeModel ready for inference
        """
        tier = Tier.LOW

        return RegimeModel(
            tier=tier.value,
            symbol=self.symbol,
            hmm=hmm,
            trained_at=self._trained_at or datetime.now(timezone.utc),
            n_observations=self._n_observations
        )

    def load_model(self) -> tuple[GaussianHMM, dict]:
        """Load saved model and normalization stats from disk.

        Returns:
            Tuple of (hmm_model, norm_stats_dict)

        Raises:
            FileNotFoundError: If model or stats file doesn't exist
        """
        if not self._model_path.exists():
            raise FileNotFoundError(f"Model not found: {self._model_path}")

        if not self._norm_stats_path.exists():
            raise FileNotFoundError(f"Norm stats not found: {self._norm_stats_path}")

        hmm = joblib.load(self._model_path)

        with open(self._norm_stats_path, "r") as f:
            norm_stats = json.load(f)

        self._norm_mean = np.array(norm_stats["mean"])
        self._norm_std = np.array(norm_stats["std"])
        self._n_observations = norm_stats["n_observations"]
        self._trained_at = datetime.fromisoformat(norm_stats["trained_at"])

        logger.info(f"Loaded model for {self.symbol}: {self._n_observations} observations")

        return hmm, norm_stats