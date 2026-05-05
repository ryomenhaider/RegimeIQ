"""Regime API endpoints for real-time regime detection."""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from api.dependencies.auth import CurrentUser, get_current_user
from core.database import get_db
from core.redis_bus import RedisBus, get_redis
from core.state import AppState, get_state

router = APIRouter(prefix="/regime", tags=["regime"])


class RegimeResponse(BaseModel):
    """Response model matching WS message format."""
    type: str = Field(default="regime_update")
    symbol: str
    regime: str
    confidence: float
    transition_probabilities: dict[str, float]
    time_in_regime_seconds: int
    transition_warning: bool
    model_tier: str
    model_reliable: bool
    timestamp: datetime


class RegimeHistoryItem(BaseModel):
    """Response model for regime history entries."""
    id: int
    symbol: str
    timestamp: datetime
    regime: str
    confidence: float
    transition_probs: dict[str, Any]
    vpin: Optional[float] = None
    kyle_lambda: Optional[float] = None
    spread: Optional[float] = None
    depth_imbalance: Optional[float] = None


class ModelInfoResponse(BaseModel):
    """Response model for model info endpoint."""
    symbol: str
    model_tier: str
    trained_at: datetime
    n_observations: int
    model_reliable: bool
    feature_means: list[float]
    feature_stds: list[float]


@router.get(
    "/{symbol}/current",
    response_model=RegimeResponse,
    summary="Get current regime state",
    description="Returns the latest regime prediction from Redis stream."
)
async def get_current(
    symbol: str,
    user: CurrentUser = Depends(get_current_user),
    redis: RedisBus = Depends(get_redis)
) -> RegimeResponse:
    """Get current regime state for a symbol."""
    if symbol.upper() not in user.symbols:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Symbol {symbol} not in watched list"
        )

    data = await redis.get_latest(f"regime:{symbol.upper()}")

    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No regime data available for {symbol}"
        )

    try:
        ts = data.get("timestamp", "")
        if ts.endswith("Z"):
            ts = ts.replace("Z", "+00:00")
        elif "+" not in ts:
            ts = ts + "+00:00"

        return RegimeResponse(
            symbol=data["symbol"],
            regime=data["regime"],
            confidence=data["confidence"],
            transition_probabilities=data["transition_probabilities"],
            time_in_regime_seconds=data["time_in_regime_seconds"],
            transition_warning=data["transition_warning"],
            model_tier=data["model_tier"],
            model_reliable=data["model_reliable"],
            timestamp=datetime.fromisoformat(ts),
        )
    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Corrupt regime data for {symbol}: {str(e)}"
        )


@router.get(
    "/{symbol}/history",
    response_model=list[RegimeHistoryItem],
    summary="Get regime history",
    description="Returns historical regime predictions from TimescaleDB."
)
async def get_history(
    symbol: str,
    start: str = "",
    end: str = "",
    user: CurrentUser = Depends(get_current_user)
) -> list[RegimeHistoryItem]:
    """Get regime history for a symbol within time range."""
    if symbol.upper() not in user.symbols:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Symbol {symbol} not in watched list"
        )

    db = get_db()
    symbol_upper = symbol.upper()

    query = "SELECT * FROM regime_states WHERE symbol = $1"
    params: list[Any] = [symbol_upper]

    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            query += " AND timestamp >= $2"
            params.append(start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start timestamp format"
            )

    if end:
        try:
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
            query += " AND timestamp <= $" + str(len(params) + 1)
            params.append(end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end timestamp format"
            )

    query += " ORDER BY timestamp ASC"

    rows = await db.fetch(query, *params)

    if not rows:
        return []

    results = []
    for row in rows:
        results.append(RegimeHistoryItem(
            id=row["id"],
            symbol=row["symbol"],
            timestamp=row["timestamp"],
            regime=row["regime"],
            confidence=float(row["confidence"]),
            transition_probs=row["transition_probs"],
            vpin=row["vpin"],
            kyle_lambda=row["kyle_lambda"],
            spread=row["spread"],
            depth_imbalance=row["depth_imbalance"],
        ))

    return results


@router.get(
    "/{symbol}/model",
    response_model=ModelInfoResponse,
    summary="Get model info",
    description="Returns information about the trained model for a symbol."
)
async def get_model(
    symbol: str,
    user: CurrentUser = Depends(get_current_user),
    state: AppState = Depends(get_state)
) -> ModelInfoResponse:
    """Get model information for a symbol."""
    if symbol.upper() not in user.symbols:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Symbol {symbol} not in watched list"
        )

    model = state.get_model(symbol.upper())

    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No model loaded for {symbol}"
        )

    feature_means = getattr(model, 'feature_means', None)
    feature_stds = getattr(model, 'feature_stds', None)

    if feature_means is None or feature_stds is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model for {symbol} missing normalization stats"
        )

    trained_at = getattr(model, 'trained_at', datetime.utcnow())
    if trained_at.tzinfo is None:
        trained_at = trained_at.replace(tzinfo=datetime.utcnow().tzinfo)

    return ModelInfoResponse(
        symbol=symbol.upper(),
        model_tier=model.tier,
        trained_at=trained_at,
        n_observations=model.n_observations,
        model_reliable=model.is_reliable() if hasattr(model, 'is_reliable') else False,
        feature_means=feature_means,
        feature_stds=feature_stds,
    )