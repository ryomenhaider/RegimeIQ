"""Symbols router - symbol management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_VALIDATION_ERROR, ERROR_NOT_FOUND, ERROR_FORBIDDEN
from api.services.factory import get_services

router = APIRouter(prefix="/symbols", tags=["symbols"])


@router.get("/available")
async def get_available_symbols(user: CurrentUser = Depends(get_current_user)):
    """Get available Binance futures symbols."""
    symbols = await get_services().symbols.get_available_symbols()
    return success_response({"symbols": symbols})


@router.get("/list")
async def get_symbol_list(user: CurrentUser = Depends(get_current_user)):
    """Get symbol list with model tier info."""
    symbols = await get_services().symbols.get_available_symbols()
    symbol_list = []
    for sym in symbols:
        viability = await get_services().symbols.check_viability(sym)
        symbol_list.append({
            "symbol": sym,
            "model_tier": viability.get("model_tier", "low"),
            "dedicated_eligible": viability.get("dedicated_eligible", False),
            "warning": viability.get("warning_message")
        })
    return success_response(symbol_list)


@router.get("/{symbol}/viability")
async def check_symbol_viability(symbol: str, user: CurrentUser = Depends(get_current_user)):
    """Check if symbol has dedicated model."""
    result = await get_services().symbols.check_viability(symbol)
    return success_response(result)


@router.get("/{username}/symbols")
async def get_user_symbols(username: str, user: CurrentUser = Depends(get_current_user)):
    """Get user's watched symbols."""
    if user.username != username and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    symbols = await get_services().symbols.get_user_symbols(username)
    return success_response({"symbols": symbols})


@router.post("/{username}/symbols")
async def add_symbol(
    username: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user)
):
    """Add symbol to user's watch list."""
    if user.username != username and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    body = await request.json()
    symbol = body.get("symbol", "").upper()
    
    try:
        result = await get_services().symbols.add_symbol(username, symbol, user.plan)
        return JSONResponse(status_code=201, content=success_response(result))
    except ValueError as e:
        error_msg = str(e)
        if "limit" in error_msg.lower():
            return JSONResponse(
                status_code=403,
                content=error_response("SYMBOL_LIMIT_REACHED", error_msg)
            )
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, error_msg)
        )


@router.delete("/{username}/symbols/{symbol}")
async def remove_symbol(
    username: str,
    symbol: str,
    user: CurrentUser = Depends(get_current_user)
):
    """Remove symbol from user's watch list."""
    if user.username != username and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    try:
        await get_services().symbols.remove_symbol(username, symbol.upper())
        return success_response({"message": "Symbol removed."})
    except ValueError as e:
        return JSONResponse(
            status_code=404,
            content=error_response(ERROR_NOT_FOUND, str(e))
        )