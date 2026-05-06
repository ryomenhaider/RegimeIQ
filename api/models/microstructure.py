"""Microstructure models - Pydantic models for market microstructure."""

from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime


class MicrostructureCurrentResponse(BaseModel):
    symbol: str
    ofi: float
    ofi_ma_10: float
    vpin: float
    kyle_lambda: float
    spread: float
    mid_price: float
    bid_pressure: float
    ask_pressure: float
    timestamp: datetime


class OrderBookLevel(BaseModel):
    price: float
    quantity: float


class OrderBookResponse(BaseModel):
    symbol: str
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    timestamp: datetime


class MicrostructureHistoryResponse(BaseModel):
    symbol: str
    data: List[MicrostructureCurrentResponse]
    total: int