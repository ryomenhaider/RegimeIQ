"""Backtest models - Pydantic models for backtesting."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class BacktestConfig(BaseModel):
    symbol: str
    start_date: datetime
    end_date: datetime
    initial_capital: float = Field(10000, gt=0)
    strategy: str = "regime_following"
    params: Optional[Dict[str, Any]] = None


class BacktestRunRequest(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float = Field(10000, gt=0)
    strategy: str = "regime_following"
    params: Optional[Dict[str, Any]] = None


class BacktestJobResponse(BaseModel):
    job_id: str
    status: str
    created_at: datetime


class BacktestResult(BaseModel):
    job_id: str
    status: str
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    trades: int
    equity_curve: List[Dict[str, Any]]
    completed_at: Optional[datetime] = None