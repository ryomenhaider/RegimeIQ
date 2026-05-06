"""Users router - user management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import HttpUrl

from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_VALIDATION_ERROR, ERROR_NOT_FOUND
from api.services.users import UsersService

router = APIRouter(prefix="/users", tags=["users"])

users_service = UsersService()


@router.get("/{username}")
async def get_profile(username: str, user: CurrentUser = Depends(get_current_user)):
    """Get user profile."""
    if user.username != username and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    try:
        profile = await users_service.get_profile(username)
        return success_response(profile)
    except ValueError as e:
        return JSONResponse(
            status_code=404,
            content=error_response(ERROR_NOT_FOUND, str(e))
        )


@router.get("/{username}/settings")
async def get_settings(username: str, user: CurrentUser = Depends(get_current_user)):
    """Get user settings."""
    if user.username != username and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    settings = await users_service.get_settings(username)
    return success_response(settings)


@router.patch("/{username}/settings")
async def update_settings(
    username: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user)
):
    """Update user settings."""
    if user.username != username and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    body = await request.json()
    try:
        settings = await users_service.update_settings(username, body)
        return success_response(settings)
    except ValueError as e:
        return JSONResponse(
            status_code=422,
            content=error_response("DISCORD_WEBHOOK_FAILED", str(e))
        )


@router.patch("/{username}/account")
async def update_account(
    username: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user)
):
    """Update email or password."""
    if user.username != username and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    body = await request.json()
    try:
        await users_service.update_account(username, body)
        return success_response({"message": "Account updated."})
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, str(e))
        )


@router.delete("/{username}")
async def delete_account(
    username: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user)
):
    """Delete user account."""
    if user.username != username and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    body = await request.json()
    confirmation = body.get("confirmation", "")
    
    if confirmation != "DELETE":
        return JSONResponse(
            status_code=400,
            content=error_response(
                ERROR_VALIDATION_ERROR,
                "Confirmation must be 'DELETE'"
            )
        )
    
    current_password = body.get("current_password", "")
    try:
        await users_service.delete_account(username, current_password)
        response = JSONResponse(
            content=success_response({"message": "Account deleted."})
        )
        response.delete_cookie("refresh_token")
        return response
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, str(e))
        )


@router.post("/{username}/alerts/test")
async def test_alert(username: str, user: CurrentUser = Depends(get_current_user)):
    """Test Discord webhook."""
    if user.username != username and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    try:
        result = await users_service.test_discord_webhook(username)
        return success_response(result)
    except ValueError as e:
        return JSONResponse(
            status_code=422,
            content=error_response("WEBHOOK_FAILED", str(e))
        )