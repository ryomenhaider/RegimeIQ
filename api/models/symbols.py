"""Symbols models - Pydantic models for symbol management."""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class SymbolResponse(BaseModel):
    symbol: str
    base_asset: str
    quote_asset: str
    status: str
    is_tradeable: bool


class UserSymbolsResponse(BaseModel):
    symbols: List[dict]
    updated_at: Optional[datetime] = None


class AddSymbolRequest(BaseModel):
    symbol: str = Field(..., max_length=20)


class AddSymbolResponse(BaseModel):
    symbol: str
    added: str
    model_tier: str
    dedicated_model: bool = False
    warning: Optional[str] = None


class SymbolViabilityResponse(BaseModel):
    symbol: str
    dedicated_eligible: bool
    days_of_data: int
    avg_daily_volume: float
    model_tier: str
    warning_message: Optional[str] = None


class SymbolInfo(BaseModel):
    symbol: str
    added_at: str
    model_tier: str
    current_regime: Optional[str] = None


class ViabilityCheck(BaseModel):
    symbol: str
    dedicated_eligible: bool
    days_of_data: int
    avg_daily_volume: float
    model_tier: str
    warning_message: Optional[str] = None