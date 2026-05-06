"""Microstructure router - market microstructure endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_NOT_FOUND, ERROR_FORBIDDEN
from api.services.microstructure import MicrostructureService

router = APIRouter(prefix="/microstructure", tags=["microstructure"])

microstructure_service = MicrostructureService()


async def validate_symbol_ownership(username: str, symbol: str) -> bool:
    """Validate user owns the symbol."""
    return await microstructure_service.check_ownership(username, symbol)


@router.get("/{symbol}/current")
async def get_current(
    symbol: str,
    user: CurrentUser = Depends(get_current_user)
):
    """Get current microstructure for a symbol."""
    symbol = symbol.upper()
    
    if not await validate_symbol_ownership(user.username, symbol):
        return JSONResponse(
            status_code=403,
            content=error_response(ERROR_FORBIDDEN, f"Symbol {symbol} not in watched list")
        )
    
    data = await microstructure_service.get_current(symbol)
    if not data:
        return JSONResponse(
            status_code=404,
            content=error_response(ERROR_NOT_FOUND, f"No data for {symbol}")
        )
    
    return success_response(data)


@router.get("/{symbol}/orderbook")
async def get_orderbook(
    symbol: str,
    user: CurrentUser = Depends(get_current_user)
):
    """Get orderbook data."""
    symbol = symbol.upper()
    
    if not await validate_symbol_ownership(user.username, symbol):
        return JSONResponse(
            status_code=403,
            content=error_response(ERROR_FORBIDDEN, f"Symbol {symbol} not in watched list")
        )
    
    data = await microstructure_service.get_current(symbol)
    if not data:
        return JSONResponse(
            status_code=404,
            content=error_response(ERROR_NOT_FOUND, f"No orderbook data for {symbol}")
        )
    
    return success_response({
        "symbol": data.get("symbol"),
        "timestamp": data.get("timestamp"),
        "bids": data.get("bids", []),
        "asks": data.get("asks", []),
        "spread": data.get("spread"),
        "mid_price": data.get("mid_price"),
        "depth_imbalance": data.get("depth_imbalance"),
        "bid_pressure": data.get("bid_pressure"),
        "ask_pressure": data.get("ask_pressure"),
        "top_bid": data.get("top_bid"),
        "top_ask": data.get("top_ask"),
    })


@router.get("/{symbol}/history")
async def get_history(
    symbol: str,
    from_ts: Optional[str] = None,
    to: Optional[str] = None,
    metrics: Optional[str] = None,
    limit: int = 100,
    user: CurrentUser = Depends(get_current_user)
):
    """Get microstructure history."""
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
    
    records = await microstructure_service.get_history(
        symbol, start_dt, end_dt, metrics, limit
    )
    
    return success_response({
        "records": records,
        "total": len(records)
    })