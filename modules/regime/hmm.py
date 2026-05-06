"""
RegimeModel inference wrapper for pre-trained GaussianHMM.

Classes:
  RegimeModel: Load and run inference on pre-trained Hidden Markov Model.
"""

import logging
from pathlib import Path
import pickle

import numpy as np
from hmmlearn.hmm import GaussianHMM

from modules.regime.models import RegimeOutput

logger = logging.getLogger(__name__)

MIN_OBSERVATIONS = 1000


class RegimeModel:
    """
    Wrapper around hmmlearn GaussianHMM for regime classification.
    
    Provides predict_proba() for posterior probability inference and
    is_reliable() for data sufficiency checks. Training is handled
    exclusively by RegimeTrainer in trainer.py — this class is
    inference-only at runtime.
    
    Do NOT call fit() from this class. This class loads a pre-trained
    model from disk and runs inference only.
    """

    def __init__(self, model_path: Path, symbol: str, tier: str) -> None:
        """
        Load a pre-trained GaussianHMM model from a .pkl file.
        
        The pkl file must contain:
          {
            'model': GaussianHMM instance (fitted),
            'label_map': dict[int, str] mapping state index to regime name,
            'feature_means': np.ndarray shape (5,),
            'feature_stds': np.ndarray shape (5,),
            'n_observations': int,
            'trained_at': str (ISO8601),
            'tier': str
          }
        
        Raises FileNotFoundError if model_path does not exist.
        Raises ValueError if pkl is missing required keys.
        Raises ValueError if model is not fitted (check_is_fitted).
        """
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        with open(model_path, 'rb') as f:
            data = pickle.load(f)
        
        required_keys = {'model', 'label_map', 'feature_means', 'feature_stds', 'n_observations', 'trained_at', 'tier'}
        missing_keys = required_keys - set(data.keys())
        if missing_keys:
            raise ValueError(f"pkl missing required keys: {missing_keys}")
        
        model = data['model']
        if not hasattr(model, 'n_features') or model.n_features != 5:
            raise ValueError("Model must be a fitted GaussianHMM with 5 features")
        
        try:
            model.check_is_fitted()
        except Exception as e:
            raise ValueError(f"Model is not fitted: {e}")
        
        self.symbol = symbol
        self.tier = tier
        self.model = model
        self.label_map = data['label_map']
        self.feature_means = data['feature_means']
        self.feature_stds = data['feature_stds']
        self.n_observations = data['n_observations']
        self.trained_at = data['trained_at']

    def predict_proba(self, feature_vector: np.ndarray) -> np.ndarray:
        """
        Run posterior inference on a single feature vector.
        
        Args:
            feature_vector: np.ndarray shape (5,) — already normalized by RegimeFeatures.
                            Order: [volatility, trend_strength, liquidity_score, vpin, ofi_z]
        
        Returns:
            np.ndarray shape (4,) — posterior probability for each regime.
            Index matches label_map keys.
            Values sum to 1.0.
        
        Raises RuntimeError if model is not loaded.
        
        Note: Use predict_proba() — NOT predict(). predict() returns Viterbi
        hard assignment with no confidence score. We need the full posterior.
        
        Implementation hint:
            score_samples() or predict_proba() from hmmlearn returns the
            posterior matrix shape (T, n_components). Pass feature_vector
            reshaped to (1, 5), return posterior[0].
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        X = feature_vector.reshape(1, -1)
        posterior = self.model.predict_proba(X)
        return posterior[0]

    def is_reliable(self) -> bool:
        """
        Check whether this model has sufficient observations to be trusted.
        
        Returns False if n_observations < MIN_OBSERVATIONS (from config, default 1000).
        Returns False if model is None (not loaded).
        Returns True otherwise.
        
        RegimePredictor checks this before calling predict_proba().
        If False, predictor falls back to rule-based classification.
        """
        if self.model is None:
            return False
        return self.n_observations >= MIN_OBSERVATIONS

    def get_transition_matrix(self) -> np.ndarray:
        """
        Return the learned transition probability matrix A.
        
        Returns:
            np.ndarray shape (4, 4).
            A[i][j] = P(regime_j | regime_i).
            Rows sum to 1.0.
        
        Used by RegimePredictor to compute transition_warning and
        populate transition_probabilities in RegimeOutput.
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")
        return self.model.transmat_

    @classmethod
    def from_path(cls, model_path: Path, symbol: str, tier: str) -> "RegimeModel | None":
        """
        Convenience constructor. Same as __init__ but returns None instead
        of raising if model file does not exist.
        
        Use this in RegimePredictor startup — allows graceful fallback
        to rule-based classification when no model file is present yet.
        """
        if not model_path.exists():
            return None
        return cls(model_path, symbol, tier)