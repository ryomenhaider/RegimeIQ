"""Backtest router - backtesting endpoints."""

import json
import asyncio
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_NOT_FOUND, ERROR_VALIDATION_ERROR
from api.services.factory import get_services

logger = logging.getLogger("api.routers.backtest")

router = APIRouter(prefix="/backtest", tags=["backtest"])


class BacktestRequest(BaseModel):
    symbol: str
    from_date: str = Field(..., alias="from")
    to: str
    strategy: str = "regime_aware_momentum"
    entry_regimes: list[str] = Field(default_factory=list)
    exit_regimes: list[str] = Field(default_factory=list)
    position_size_pct: float = 0.1

    class Config:
        populate_by_name = True


async def run_backtest_task(job_id: str, request: dict):
    """Async task to run backtest."""
    logger.info(f"Starting backtest job {job_id}")
    try:
        await get_services().backtest.run_backtest(job_id, request)
        logger.info(f"Backtest job {job_id} completed successfully")
    except Exception as e:
        logger.error(f"Backtest job {job_id} failed: {e}")
        # Error is already handled in run_backtest method


@router.post("/run")
async def run_backtest(
    request: Request,
    user: CurrentUser = Depends(get_current_user)
):
    """Start async backtest job."""
    body = await request.json()

    valid, error_msg = await get_services().backtest.validate_request(body)
    if not valid:
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, error_msg)
        )

    job = await get_services().backtest.create_job(user.username, body)

    task = asyncio.create_task(run_backtest_task(job["job_id"], body))
    task.add_done_callback(
        lambda t: logger.error(f"Task failed: {t.exception()}") if t.exception() else None
    )

    return JSONResponse(
        status_code=202,
        content=success_response(job)
    )


@router.get("/{job_id}")
async def get_backtest_result(
    job_id: str,
    user: CurrentUser = Depends(get_current_user)
):
    """Get backtest result."""
    job = await get_services().backtest.get_job(job_id, user.username)
    
    if not job:
        return JSONResponse(
            status_code=404,
            content=error_response(ERROR_NOT_FOUND, "Job not found")
        )
    
    return success_response(job)


@router.get("/history")
async def get_history(
    limit: int = 20,
    user: CurrentUser = Depends(get_current_user)
):
    """Get backtest history."""
    jobs = await get_services().backtest.get_history(user.username, limit)
    return success_response({"jobs": jobs})