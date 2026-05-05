"""Altdata API endpoints for confluence and signal queries."""

import json
import logging
from datetime import datetime
from typing import Any, Optional

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from api.dependencies.auth import CurrentUser, get_current_user
from core.database import get_db
from core.redis_bus import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/altdata", tags=["altdata"])

VALID_SOURCES = ["reddit", "onchain", "trends", "macro", "futures"]


class ConfluenceResponse(BaseModel):
    """Response model for confluence endpoint."""
    type: str = Field(default="altdata_confluence")
    score: float
    direction: str
    alert_triggered: bool
    sources: dict[str, Any]
    timestamp: str


class AltDataSignalItem(BaseModel):
    """Response model for altdata signal history."""
    id: int
    symbol: str
    source: str
    timestamp: datetime
    signal_type: str
    value: float
    metadata: Optional[dict[str, Any]] = None
    z_score: Optional[float] = None
    confluence_score: Optional[float] = None


class SourceSignalResponse(BaseModel):
    """Response model for single source latest."""
    source: str
    symbol: str
    score: float
    z_score: float
    velocity_z: float
    timestamp: str
    is_spike: bool = False


class CorrelationResponse(BaseModel):
    """Response model for correlation matrix."""
    sources: list[str]
    matrix: list[list[float]]


@router.get(
    "/confluence",
    response_model=ConfluenceResponse,
    summary="Get current confluence",
    description="Returns the latest confluence signal from Redis stream."
)
async def get_confluence(
    user: CurrentUser = Depends(get_current_user),
    redis=Depends(get_redis)
) -> ConfluenceResponse:
    """Get current confluence from Redis."""
    data = await redis.get_latest("altdata:confluence")

    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No confluence data available"
        )

    return ConfluenceResponse(**data)


@router.get(
    "/{source}/latest",
    response_model=SourceSignalResponse,
    summary="Get latest signal for source",
    description="Returns the latest signal for a specific source."
)
async def get_source_latest(
    source: str,
    user: CurrentUser = Depends(get_current_user),
    redis=Depends(get_redis)
) -> SourceSignalResponse:
    """Get latest signal for a source."""
    if source not in VALID_SOURCES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid source. Valid: {VALID_SOURCES}"
        )

    data = await redis.get_latest("altdata:signals")

    if data is None or data.get("source") != source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No signal data for source: {source}"
        )

    return SourceSignalResponse(
        source=data.get("source", source),
        symbol=data.get("symbol", ""),
        score=data.get("score", 0.0),
        z_score=data.get("z_score", 0.0),
        velocity_z=data.get("velocity_z", 0.0),
        timestamp=data.get("timestamp", ""),
        is_spike=data.get("is_spike", False)
    )


@router.get(
    "/history",
    response_model=list[AltDataSignalItem],
    summary="Get signal history",
    description="Returns historical signals from TimescaleDB."
)
async def get_history(
    source: Optional[str] = Query(None, description="Filter by source"),
    start: str = Query("", description="Start timestamp (ISO)"),
    end: str = Query("", description="End timestamp (ISO)"),
    user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db)
) -> list[AltDataSignalItem]:
    """Get signal history from database."""
    if source and source not in VALID_SOURCES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid source. Valid: {VALID_SOURCES}"
        )

    query = "SELECT * FROM alt_data_signals WHERE 1=1"
    params: list[Any] = []

    if source:
        query += " AND source = $1"
        params.append(source)

    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            query += " AND timestamp >= $" + str(len(params) + 1)
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
        results.append(AltDataSignalItem(
            id=row["id"],
            symbol=row["symbol"],
            source=row["source"],
            timestamp=row["timestamp"],
            signal_type=row["signal_type"],
            value=float(row["value"]) if row.get("value") else 0.0,
            metadata=row.get("metadata"),
            z_score=float(row["z_score"]) if row.get("z_score") else None,
            confluence_score=float(row["confluence_score"]) if row.get("confluence_score") else None
        ))

    return results


@router.get(
    "/correlation",
    response_model=CorrelationResponse,
    summary="Get source correlation matrix",
    description="Returns Pearson correlation matrix across sources."
)
async def get_correlation(
    user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db),
    redis=Depends(get_redis)
) -> CorrelationResponse:
    """Get correlation matrix from sources."""
    cache_key = "altdata:correlation"
    cached = await redis.redis.get(cache_key)

    if cached:
        try:
            data = json.loads(cached)
            return CorrelationResponse(**data)
        except Exception:
            pass

    sources_data: dict[str, list[float]] = {}

    for source in VALID_SOURCES:
        try:
            rows = await db.fetch(
                """
                SELECT value FROM alt_data_signals
                WHERE source = $1
                ORDER BY timestamp DESC
                LIMIT 200
                """,
                source
            )
            values = [row["value"] for row in rows if row.get("value") is not None]
            if values:
                sources_data[source] = list(reversed(values))
        except Exception as e:
            logger.warning(f"Correlation fetch error for {source}: {e}")
            continue

    if len(sources_data) < 2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insufficient data for correlation"
        )

    min_len = min(len(v) for v in sources_data.values())
    if min_len < 10:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insufficient data points for correlation"
        )

    sources_list = list(sources_data.keys())
    aligned_data = {s: sources_data[s][:min_len] for s in sources_list}

    matrix = np.corrcoef([aligned_data[s] for s in sources_list])
    matrix = matrix.tolist()

    response = CorrelationResponse(
        sources=sources_list,
        matrix=matrix
    )

    try:
        await redis.redis.setex(
            cache_key,
            3600,
            json.dumps(response.model_dump())
        )
    except Exception:
        pass

    return response