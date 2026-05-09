"""Regime router - regime detection endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse

from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_NOT_FOUND, ERROR_FORBIDDEN
from api.services.factory import get_services

router = APIRouter(prefix="/regime", tags=["regime"])


async def validate_symbol_ownership(username: str, symbol: str) -> bool:
    """Validate user owns the symbol."""
    return await get_services().regime.check_ownership(username, symbol)


@router.get("/current")
async def get_all_current(user: CurrentUser = Depends(get_current_user)):
    """Get current regime for all user symbols."""
    result = await get_services().regime.get_all_current(user.username)
    return success_response(result)


@router.get("/{symbol}/current")
async def get_current(
    symbol: str,
    user: CurrentUser = Depends(get_current_user)
):
    """Get current regime for a symbol."""
    symbol = symbol.upper()
    
    if not await validate_symbol_ownership(user.username, symbol):
        return JSONResponse(
            status_code=403,
            content=error_response(ERROR_FORBIDDEN, f"Symbol {symbol} not in watched list")
        )
    
    data = await get_services().regime.get_current(symbol)
    if not data:
        return JSONResponse(
            status_code=404,
            content=error_response(ERROR_NOT_FOUND, f"No regime data for {symbol}")
        )
    
    return success_response(data)


@router.get("/{symbol}/history")
async def get_history(
    symbol: str,
    from_ts: Optional[str] = None,
    to: Optional[str] = None,
    limit: int = 100,
    user: CurrentUser = Depends(get_current_user)
):
    """Get regime history."""
    symbol = symbol.upper()
    
    if not await validate_symbol_ownership(user.username, symbol):
        return JSONResponse(
            status_code=403,
            content=error_response(ERROR_FORBIDDEN, f"Symbol {symbol} not in watched list")
        )
    
    start_dt = None
    end_dt = None
    
    if from_ts:
        try:
            start_dt = datetime.fromisoformat(from_ts.replace("Z", "+00:00"))
        except ValueError:
            pass
    
    if to:
        try:
            end_dt = datetime.fromisoformat(to.replace("Z", "+00:00"))
        except ValueError:
            pass
    
    limit = min(limit, 1000)
    records = await get_services().regime.get_history(symbol, start_dt, end_dt, limit)
    
    return success_response({
        "records": records,
        "total": len(records)
    })


@router.get("/{symbol}/model")
async def get_model(
    symbol: str,
    user: CurrentUser = Depends(get_current_user)
):
    """Get model info."""
    symbol = symbol.upper()
    
    if not await validate_symbol_ownership(user.username, symbol):
        return JSONResponse(
            status_code=403,
            content=error_response(ERROR_FORBIDDEN, f"Symbol {symbol} not in watched list")
        )
    
    model_info = await get_services().regime.get_model_info(symbol)
    if not model_info:
        return JSONResponse(
            status_code=404,
            content=error_response(ERROR_NOT_FOUND, f"No model for {symbol}")
        )
    
    return success_response(model_info)