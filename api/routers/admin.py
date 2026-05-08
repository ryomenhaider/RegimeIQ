"""Admin router - admin management endpoints."""

from typing import Annotated

import aiohttp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_NOT_FOUND, ERROR_FORBIDDEN, ERROR_VALIDATION_ERROR
from api.services.factory import get_services

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    """Require admin role."""
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return user


@router.get("/config", include_in_schema=False)
async def get_config(user: CurrentUser = Depends(require_admin)):
    """Get system config."""
    config = await get_services().admin.get_config()
    return success_response({"config": config})


@router.patch("/config", include_in_schema=False)
async def update_config(
    request: Request,
    user: CurrentUser = Depends(require_admin)
):
    """Update system config."""
    body = await request.json()
    key = body.get("key")
    value = body.get("value")

    if not key:
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, "key required")
        )

    await get_services().admin.update_config(user.username, key, str(value))
    await get_services().admin.log_audit(user.username, "update_config", key)

    return success_response({"key": key, "value": value})


@router.post("/config/reload", include_in_schema=False)
async def reload_config(user: CurrentUser = Depends(require_admin)):
    """Reload config into memory."""
    count = await get_services().admin.reload_config()
    await get_services().admin.log_audit(user.username, "reload_config", f"keys={count}")

    return success_response({"message": "Config reloaded.", "keys_loaded": count})


@router.get("/users", include_in_schema=False)
async def list_users(
    page: int = 1,
    limit: int = 50,
    user: CurrentUser = Depends(require_admin)
):
    """List all users."""
    limit = min(limit, 200)
    offset = (page - 1) * limit

    users, total = await get_services().admin.list_users(limit, offset)

    return success_response({
        "users": users,
        "total": total,
        "page": page
    })


@router.get("/users/{username}", include_in_schema=False)
async def get_user_detail(
    username: str,
    user: CurrentUser = Depends(require_admin)
):
    """Get full user detail."""
    detail = await get_services().admin.get_user_detail(username)

    if not detail:
        return JSONResponse(
            status_code=404,
            content=error_response(ERROR_NOT_FOUND, "User not found")
        )

    return success_response(detail)


@router.patch("/users/{username}", include_in_schema=False)
async def update_user(
    username: str,
    request: Request,
    user: CurrentUser = Depends(require_admin)
):
    """Update user."""
    body = await request.json()
    plan = body.get("plan")
    status = body.get("status")

    if not plan and not status:
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, "plan or status required")
        )

    result = await get_services().admin.update_user(username, plan, status)
    await get_services().admin.log_audit(user.username, "update_user", username)

    return success_response(result)


@router.get("/models", include_in_schema=False)
async def get_models(user: CurrentUser = Depends(require_admin)):
    """Get all HMM models."""
    models = await get_services().admin.get_models()
    return success_response({"models": models})


@router.post("/models/retrain", include_in_schema=False)
async def retrain_model(
    request: Request,
    user: CurrentUser = Depends(require_admin)
):
    """Trigger HMM retrain."""
    body = await request.json()
    symbol = body.get("symbol")

    if not symbol:
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, "symbol required")
        )

    await get_services().admin.queue_retrain(symbol)
    await get_services().admin.log_audit(user.username, "retrain_model", symbol)

    return success_response({"message": f"Retrain queued for {symbol}."})


@router.get("/metrics", include_in_schema=False)
async def get_metrics(user: CurrentUser = Depends(require_admin)):
    """Get system metrics."""
    metrics = await get_services().admin.get_system_metrics()
    return success_response(metrics)


@router.get("/audit-log", include_in_schema=False)
async def get_audit_log(
    limit: int = 50,
    user: CurrentUser = Depends(require_admin)
):
    """Get audit log."""
    limit = min(limit, 500)
    entries = await get_services().admin.get_audit_log(limit)
    return success_response({"entries": entries})


@router.post("/beta-codes/generate", include_in_schema=False)
async def generate_beta_code(
    request: Request,
    user: CurrentUser = Depends(require_admin)
):
    """Generate a new beta code."""
    body = await request.json()
    expires_days = body.get("expires_days", 30)

    result = await get_services().admin.generate_beta_code(user.username, expires_days)
    await get_services().admin.log_audit(user.username, "generate_beta_code", result["code"])

    return success_response(result)


@router.get("/beta-codes", include_in_schema=False)
async def list_beta_codes(
    page: int = 1,
    limit: int = 50,
    user: CurrentUser = Depends(require_admin)
):
    """List all beta codes."""
    limit = min(limit, 200)
    offset = (page - 1) * limit

    codes, total = await get_services().admin.list_beta_codes(limit, offset)

    return success_response({
        "codes": codes,
        "total": total,
        "page": page
    })


@router.post("/beta-codes/{code}/revoke", include_in_schema=False)
async def revoke_beta_code(
    code: str,
    user: CurrentUser = Depends(require_admin)
):
    """Revoke a beta code."""
    result = await get_services().admin.revoke_beta_code(code, user.username)
    return success_response(result)


@router.delete("/users/{username}", include_in_schema=False)
async def delete_user(
    username: str,
    user: CurrentUser = Depends(require_admin)
):
    """Delete a user."""
    result = await get_services().admin.delete_user(username, user.username)
    return success_response(result)


@router.post("/users/{username}/ban", include_in_schema=False)
async def ban_user(
    username: str,
    user: CurrentUser = Depends(require_admin)
):
    """Ban a user."""
    result = await get_services().admin.ban_user(username, user.username)
    return success_response(result)


@router.post("/users/{username}/unban", include_in_schema=False)
async def unban_user(
    username: str,
    user: CurrentUser = Depends(require_admin)
):
    """Unban a user."""
    result = await get_services().admin.unban_user(username, user.username)
    return success_response(result)
