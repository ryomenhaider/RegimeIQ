"""AltData router - alternative data endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_NOT_FOUND, ERROR_VALIDATION_ERROR

VALID_SOURCES = {"reddit", "fred", "trends", "onchain", "futures"}

altdata_service = None

try:
    from api.services.altdata import AltDataService
    altdata_service = AltDataService()
except Exception:
    pass


router = APIRouter(prefix="/altdata", tags=["altdata"])


def validate_source(source: str) -> bool:
    """Validate source is valid."""
    return source in VALID_SOURCES


@router.get("/confluence")
async def get_confluence(user: CurrentUser = Depends(get_current_user)):
    """Get confluence data."""
    if altdata_service:
        data = await altdata_service.get_confluence()
        if data:
            return success_response(data)
    return JSONResponse(
        status_code=404,
        content=error_response(ERROR_NOT_FOUND, "No confluence data available")
    )


@router.get("/{source}/latest")
async def get_source_latest(
    source: str,
    user: CurrentUser = Depends(get_current_user)
):
    """Get latest signal for source."""
    if not validate_source(source):
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, f"Invalid source: {source}")
        )
    
    if altdata_service:
        data = await altdata_service.get_source_latest(source)
        if data:
            return success_response(data)
    
    return JSONResponse(
        status_code=404,
        content=error_response(ERROR_NOT_FOUND, f"No data for {source}")
    )


@router.get("/history")
async def get_history(
    source: Optional[str] = None,
    from_ts: Optional[str] = None,
    to: Optional[str] = None,
    limit: int = 100,
    user: CurrentUser = Depends(get_current_user)
):
    """Get signal history."""
    if source and not validate_source(source):
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, f"Invalid source: {source}")
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
    
    if altdata_service:
        records = await altdata_service.get_history(source, start_dt, end_dt, limit)
    else:
        records = []
    
    return success_response({
        "records": records,
        "total": len(records)
    })


@router.get("/correlation")
async def get_correlation(user: CurrentUser = Depends(get_current_user)):
    """Get correlation matrix."""
    if altdata_service:
        data = await altdata_service.get_correlation()
        if data:
            return success_response(data)
    
    return JSONResponse(
        status_code=404,
        content=error_response(ERROR_NOT_FOUND, "Cannot compute correlation")
    )