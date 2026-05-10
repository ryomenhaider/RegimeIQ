import logging
from pathlib import Path
from datetime import datetime
import pickle

import numpy as np
import asyncpg
from hmmlearn.hmm import GaussianHMM

from modules.regime.features import RegimeFeatures, MicrostructureOutput
from core.database import get_db, Database

logger = logging.getLogger(__name__)


class RegimeTrainer:

    def __init__(
        self,
        symbol: str,
        tier: str,
        config: dict
    ) -> None:
        self.symbol = symbol
        self.tier = tier
        self.config = config
        self.features = RegimeFeatures()

        self.training_window_days = config.get("training_window_days", 90)
        self.walk_forward_train_days = config.get("walk_forward_train_days", 60)
        self.walk_forward_test_days = config.get("walk_forward_test_days", 30)
        self.min_observations = config.get("min_observations", 1000)
        self.n_components = config.get("n_components", 4)
        self.covariance_type = config.get("covariance_type", "full")
        self.convergence_threshold = config.get("convergence_threshold", 1e-4)
        self.model_output_dir = config.get("model_output_dir", Path("models"))

        self._norm_mean: np.ndarray = None
        self._norm_std: np.ndarray = None

    async def fetch_training_data(self) -> np.ndarray:

        db = get_db()
        
        query = """
            SELECT ofi_ma_10, vpin, kyle_lambda, spread, mid_price,
                   bid_pressure, ask_pressure, timestamp
            FROM microstructure_raw
            WHERE symbol = $1
              AND timestamp >= NOW() - INTERVAL '{} days'
            ORDER BY timestamp ASC
        """.format(self.training_window_days)
        
        rows = await db.fetch(query, self.symbol)
        
        if not rows:
            raise ValueError(f"No data found for symbol {self.symbol}")
        
        if len(rows) < self.min_observations:
            raise ValueError(
                f"Insufficient observations: {len(rows)} < {self.min_observations}"
            )
        
        first_ts = rows[0]['timestamp']
        last_ts = rows[-1]['timestamp']
        logger.info(
            f"Fetched {len(rows)} rows for {self.symbol}, "
            f"range: {first_ts} to {last_ts}"
        )
        
        feature_vectors = []
        for row in rows:
            ms_output = MicrostructureOutput(
                symbol=self.symbol,
                ofi_ma_10=float(row['ofi_ma_10'] or 0),
                vpin=float(row['vpin'] or 0),
                kyle_lambda=row['kyle_lambda'],
                spread=row['spread'],
                mid_price=row['mid_price'],
                bid_pressure=float(row['bid_pressure'] or 0),
                ask_pressure=float(row['ask_pressure'] or 0),
                timestamp=int(row['timestamp'].timestamp())
            )
            feature_vec = self.features.update(ms_output)
            feature_vectors.append(feature_vec)
        
        return np.array(feature_vectors, dtype=np.float64)

    def fit(self, feature_matrix: np.ndarray) -> GaussianHMM:
        
        model = GaussianHMM(
            n_components=self.n_components,
            covariance_type=self.covariance_type,
            tol=self.convergence_threshold,
            n_iter=100,
            random_state=42
        )
        
        model.fit(feature_matrix)
        
        score = model.score(feature_matrix)
        logger.info(f"Fitted GaussianHMM with log-likelihood: {score:.4f}")
        
        return model

    def walk_forward_validate(self, feature_matrix: np.ndarray) -> dict:
        
        total_days = self.walk_forward_train_days + self.walk_forward_test_days
        train_cutoff = int(len(feature_matrix) * (self.walk_forward_train_days / total_days))
        
        train_matrix = feature_matrix[:train_cutoff]
        test_matrix = feature_matrix[train_cutoff:]
        
        model = GaussianHMM(
            n_components=self.n_components,
            covariance_type=self.covariance_type,
            tol=self.convergence_threshold,
            n_iter=100,
            random_state=42
        )
        
        model.fit(train_matrix)
        
        train_score = model.score(train_matrix)
        test_score = model.score(test_matrix)
        
        logger.info(
            f"Walk-forward validation: train_ll={train_score:.4f}, "
            f"test_ll={test_score:.4f}, train_size={len(train_matrix)}, "
            f"test_size={len(test_matrix)}"
        )
        
        return {
            'train_log_likelihood': train_score,
            'test_log_likelihood': test_score,
            'train_size': len(train_matrix),
            'test_size': len(test_matrix),
            'passed': test_score > self.convergence_threshold
        }

    def save(
        self,
        model: GaussianHMM,
        feature_matrix: np.ndarray,
        validation_results: dict
    ) -> Path:

        self.model_output_dir.mkdir(parents=True, exist_ok=True)
        
        output_path = self.model_output_dir / f"hmm_{self.symbol}.pkl"
        
        vol_mean, vol_std = self.features._rolling_mean_std(self.features._vol_history)
        trend_mean, trend_std = self.features._rolling_mean_std(self.features._trend_history)
        liq_mean, liq_std = self.features._rolling_mean_std(self.features._liq_history)
        vpin_mean, vpin_std = self.features._rolling_mean_std(self.features._vpin_history)
        ofi_z_mean, ofi_z_std = self.features._rolling_mean_std(self.features._ofi_z_history)
        
        feature_means = np.array([vol_mean, trend_mean, liq_mean, vpin_mean, ofi_z_mean], dtype=np.float64)
        feature_stds = np.array([vol_std, trend_std, liq_std, vpin_std, ofi_z_std], dtype=np.float64)
        
        data = {
            'model': model,
            'label_map': {
                0: 'trending',
                1: 'mean_reverting',
                2: 'volatile',
                3: 'illiquid'
            },
            'feature_means': feature_means,
            'feature_stds': feature_stds,
            'n_observations': len(feature_matrix),
            'trained_at': datetime.utcnow().isoformat() + 'Z',
            'tier': self.tier,
            'symbol': self.symbol,
            'validation_results': validation_results
        }
        
        with open(output_path, 'wb') as f:
            pickle.dump(data, f)
        
        logger.info(f"Saved model to {output_path}")
        
        return output_path

    async def run(self) -> Path:
        logger.info(f"Starting HMM training for {self.symbol} (tier: {self.tier})")
        
        logger.info(f"Step 1: Fetching training data ({self.training_window_days} days)")
        feature_matrix = await self.fetch_training_data()
        
        logger.info("Step 2: Walk-forward validation")
        validation_results = self.walk_forward_validate(feature_matrix)
        
        if not validation_results['passed']:
            raise ValueError(
                f"Validation failed: test_ll={validation_results['test_log_likelihood']}"
            )
        
        logger.info("Step 3: Fitting model on full data")
        model = self.fit(feature_matrix)
        
        logger.info("Step 4: Saving model")
        pkl_path = self.save(model, feature_matrix, validation_results)
        
        logger.info(f"Training complete: {pkl_path}")
        
        return pkl_path