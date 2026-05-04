from typing import Optional, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional

from api.dependencies.auth import get_current_user, validate_symbol, CurrentUser
from core.database import get_db
from core.redis_bus import get_redis

router = APIRouter(prefix="/microstructure", tags=["microstructure"])


class MicrostructureCurrentResponse(BaseModel):
    symbol: str
    timestamp: int
    ofi: float
    ofi_ma_10: float
    vpin: float
    kyle_lambda: Optional[float] = None
    cvd: float
    trade_intensity: float
    spread: Optional[float] = None
    mid_price: Optional[float] = None
    weighted_mid_price: Optional[float] = None
    depth_imbalance: Optional[float] = None
    adverse_selection_pct: float
    vwap_deviation: Optional[float] = None
    bid_pressure: float
    ask_pressure: float
    top_bid: Optional[float] = None
    top_ask: Optional[float] = None
    bids: list[list[float]]
    asks: list[list[float]]


class MicrostructureOrderbookResponse(BaseModel):
    symbol: str
    timestamp: int
    bids: list[list[float]]
    asks: list[list[float]]
    spread: Optional[float] = None
    mid_price: Optional[float] = None
    depth_imbalance: Optional[float] = None
    bid_pressure: float
    ask_pressure: float
    top_bid: Optional[float] = None
    top_ask: Optional[float] = None


class MicrostructureHistoryItem(BaseModel):
    id: int
    symbol: str
    timestamp: datetime
    ofi: Optional[float] = None
    ofi_ma_10: Optional[float] = None
    vpin: Optional[float] = None
    kyle_lambda: Optional[float] = None
    cvd: Optional[float] = None
    trade_intensity: Optional[float] = None
    spread: Optional[float] = None
    mid_price: Optional[float] = None
    weighted_mid_price: Optional[float] = None
    depth_imbalance: Optional[float] = None
    adverse_selection_pct: Optional[float] = None
    vwap_deviation: Optional[float] = None
    bid_pressure: Optional[float] = None
    ask_pressure: Optional[float] = None
    top_bid: Optional[float] = None
    top_ask: Optional[float] = None
    bids: Optional[list] = None
    asks: Optional[list] = None


@router.get("/{symbol}/current", response_model=MicrostructureCurrentResponse)
async def get_current(
    symbol: str = Depends(validate_symbol)
):
    redis = get_redis()
    data = await redis.get_latest(f"microstructure:{symbol}")

    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No data for {symbol}"
        )

    return data


@router.get("/{symbol}/orderbook", response_model=MicrostructureOrderbookResponse)
async def get_orderbook(
    symbol: str = Depends(validate_symbol)
):
    redis = get_redis()
    data = await redis.get_latest(f"microstructure:{symbol}")

    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No orderbook data for {symbol}"
        )

    return {
        "symbol": data["symbol"],
        "timestamp": data["timestamp"],
        "bids": data["bids"],
        "asks": data["asks"],
        "spread": data["spread"],
        "mid_price": data["mid_price"],
        "depth_imbalance": data["depth_imbalance"],
        "bid_pressure": data["bid_pressure"],
        "ask_pressure": data["ask_pressure"],
        "top_bid": data["top_bid"],
        "top_ask": data["top_ask"],
    }


@router.get("/{symbol}/history", response_model=list[MicrostructureHistoryItem])
async def get_history(
    symbol: str = Depends(validate_symbol),
    start: str = Query(..., description="ISO timestamp"),
    end: str = Query(..., description="ISO timestamp")
):
    db = get_db()

    start_dt = datetime.fromisoformat(start)
    end_dt = datetime.fromisoformat(end)

    rows = await db.fetch(
        """
        SELECT * FROM microstructure
        WHERE symbol = $1 AND timestamp BETWEEN $2 AND $3
        ORDER BY timestamp DESC
        """,
        symbol, start_dt, end_dt
    )

    return [dict(row) for row in rows]