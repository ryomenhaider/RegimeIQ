"""Regime API endpoints for real-time regime detection."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from api.dependencies.auth import get_current_user, validate_symbol, CurrentUser
from core.redis_bus import get_redis, RedisBus

router = APIRouter(prefix="/regime", tags=["regime"])


class RegimeResponse(BaseModel):
    """Response model for regime current state endpoint."""

    symbol: str = Field(..., description="Trading symbol")
    regime: str = Field(..., description="Current regime label")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Max posterior probability")
    transition_probs: dict[str, float] = Field(
        ..., description="Transition probabilities for all regimes"
    )
    time_in_regime: int = Field(..., ge=0, description="Seconds since last regime change")
    transition_warning: bool = Field(
        ..., description="True if any transition probability exceeds 0.2"
    )
    model_tier: str = Field(..., description="Model tier (dedicated, high, mid, low)")
    model_reliable: bool = Field(
        ..., description="True if model has sufficient observations"
    )
    timestamp: datetime = Field(..., description="Timestamp of this prediction")


@router.get(
    "/{symbol}/current",
    response_model=RegimeResponse,
    summary="Get current regime state",
    description="""
    Returns the current regime detection state for a given symbol.

    Reads the latest regime prediction from Redis and returns the current
    regime label, confidence score, transition probabilities, and metadata.
    """
)
async def get_current(
    symbol: str = Depends(validate_symbol),
    redis: RedisBus = Depends(get_redis)
) -> RegimeResponse:
    """Get current regime state for a symbol.

    Args:
        symbol: Trading symbol (e.g., BTCUSDT)
        redis: Redis bus dependency

    Returns:
        RegimeResponse with current regime state

    Raises:
        HTTP 404: If no regime data available for symbol
        HTTP 500: If regime data is corrupt
    """
    data = await redis.get_latest(f"regime:{symbol}")

    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No regime data available for {symbol}"
        )

    try:
        return RegimeResponse(
            symbol=data["symbol"],
            regime=data["regime"],
            confidence=data["confidence"],
            transition_probs=data["transition_probabilities"],
            time_in_regime=data["time_in_regime_seconds"],
            transition_warning=data["transition_warning"],
            model_tier=data["model_tier"],
            model_reliable=data["model_reliable"],
            timestamp=datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
        )
    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Corrupt regime data for {symbol}: {str(e)}"
        )


class RegimeHistoryItem(BaseModel):
    """Response model for regime history entries."""

    id: int
    symbol: str
    timestamp: datetime
    regime: str
    confidence: float
    transition_probs: dict
    vpin: Optional[float] = None
    kyle_lambda: Optional[float] = None
    spread: Optional[float] = None
    depth_imbalance: Optional[float] = None


@router.get(
    "/{symbol}/history",
    response_model=list[RegimeHistoryItem],
    summary="Get regime history",
    description="Returns historical regime predictions from the database."
)
async def get_history(
    symbol: str = Depends(validate_symbol),
    start: str = "",
    end: str = "",
    limit: int = 100
):
    """Get regime history for a symbol.

    Args:
        symbol: Trading symbol
        start: Start timestamp (ISO format)
        end: End timestamp (ISO format)
        limit: Maximum number of records to return

    Returns:
        List of RegimeHistoryItem
    """
    from core.database import get_db
    db = get_db()

    query = """
        SELECT * FROM regime_states
        WHERE symbol = $1
    """
    params = [symbol.upper()]

    if start:
        query += " AND timestamp >= $2"
        params.append(datetime.fromisoformat(start))
    if end:
        query += " AND timestamp <= $" + str(len(params) + 1)
        params.append(datetime.fromisoformat(end))

    query += " ORDER BY timestamp DESC LIMIT $" + str(len(params) + 1)
    params.append(limit)

    rows = await db.fetch(query, *params)

    return [dict(row) for row in rows]