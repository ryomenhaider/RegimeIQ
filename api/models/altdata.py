"""AltData models - Pydantic models for alternative data."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class AltDataSignal(BaseModel):
    id: int
    symbol: Optional[str] = None
    source: str
    timestamp: datetime
    signal_type: str
    value: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    z_score: Optional[float] = None
    confluence_score: Optional[float] = None


class AltDataLatestResponse(BaseModel):
    source: str
    signal: AltDataSignal


class AltDataHistoryResponse(BaseModel):
    source: str
    signals: List[AltDataSignal]
    total: int


class AltDataConfluenceResponse(BaseModel):
    symbol: str
    timestamp: datetime
    confluence_score: float
    signals: List[Dict[str, Any]]
    regime_aligned: bool
    macro_aligned: bool


class CorrelationMatrixResponse(BaseModel):
    sources: List[str]
    matrix: List[List[float]]
    computed_at: datetime