"""Performance router - strategy performance and backtest endpoints."""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_NOT_FOUND
from api.services.factory import get_services

router = APIRouter(prefix="/performance", tags=["performance"])


@router.get("/log")
async def get_performance_log(
    request: Request,
    limit: int = 50,
    offset: int = 0
):
    """Get walk-forward validated performance history."""
    try:
        data = await get_services().backtest.get_performance_log(limit, offset)
        return success_response(data)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=error_response("FETCH_ERROR", str(e))
        )


@router.get("/summary")
async def get_performance_summary(user: CurrentUser = Depends(get_current_user)):
    """Get performance summary for current user."""
    try:
        data = await get_services().backtest.get_performance_summary(user.username)
        return success_response(data)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=error_response("FETCH_ERROR", str(e))
        )


@router.get("/backtests")
async def get_backtests(
    symbol: str | None = None,
    limit: int = 20
):
    """Get backtest history."""
    try:
        data = await get_services().backtest.get_backtest_history(symbol, limit)
        return success_response(data)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=error_response("FETCH_ERROR", str(e))
        )