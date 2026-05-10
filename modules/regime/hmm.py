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
   

    def __init__(self, model_path: Path, symbol: str, tier: str) -> None:
        
       
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
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        X = feature_vector.reshape(1, -1)
        posterior = self.model.predict_proba(X)
        return posterior[0]

    def is_reliable(self) -> bool:
        if self.model is None:
            return False
        return self.n_observations >= MIN_OBSERVATIONS

    def get_transition_matrix(self) -> np.ndarray:
       
        if self.model is None:
            raise RuntimeError("Model not loaded")
        return self.model.transmat_

    @classmethod
    def from_path(cls, model_path: Path, symbol: str, tier: str) -> "RegimeModel | None":
       
        if not model_path.exists():
            return None
        return cls(model_path, symbol, tier)
