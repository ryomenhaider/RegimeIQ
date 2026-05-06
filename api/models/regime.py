"""Regime models - Pydantic models for regime detection."""

from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime


class RegimeStateResponse(BaseModel):
    symbol: str
    regime: str
    confidence: float
    transition_probs: Dict[str, float]
    vpin: Optional[float] = None
    kyle_lambda: Optional[float] = None
    spread: Optional[float] = None
    depth_imbalance: Optional[float] = None
    timestamp: datetime


class RegimeHistoryResponse(BaseModel):
    symbol: str
    states: List[RegimeStateResponse]
    total: int


class RegimeModelResponse(BaseModel):
    symbol: str
    tier: str
    n_components: int
    feature_means: List[float]
    feature_stds: List[float]
    n_observations: int
    trained_at: datetime