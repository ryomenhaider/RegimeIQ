"""Auth router - authentication endpoints."""

import re
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer

from api.models.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    CSRFResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AdminLoginRequest,
)
from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_VALIDATION_ERROR, ERROR_UNAUTHORIZED, ERROR_NOT_FOUND
from api.services.factory import get_services
from api.services.auth import ACCESS_TOKEN_EXPIRE_MINUTES


router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


def set_refresh_cookie(response: JSONResponse, refresh_token: str) -> JSONResponse:
    """Set refresh token as HttpOnly cookie."""
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=30 * 24 * 60 * 60,
    )
    return response


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, body: RegisterRequest):
    """Register a new user account."""
    try:
        result = await get_services().auth.register(
            username=body.username,
            email=body.email,
            password=body.password,
            beta_code=body.beta_code
        )
        response = JSONResponse(
            status_code=201,
            content=success_response({
                "access_token": result["access_token"],
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "username": result["username"],
                "plan": result["plan"],
                "skip_billing": result.get("skip_billing", False)
            })
        )
        return set_refresh_cookie(response, result["refresh_token"])
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, str(e))
        )


@router.post("/admin-login")
async def admin_login(request: Request, body: AdminLoginRequest):
    """Admin login using .env credentials."""
    try:
        result = await get_services().auth.admin_login(
            username=body.username,
            password=body.password
        )
        response = JSONResponse(
            content=success_response({
                "access_token": result["access_token"],
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "username": result["username"],
                "plan": result["plan"]
            })
        )
        return set_refresh_cookie(response, result["refresh_token"])
    except ValueError as e:
        return JSONResponse(
            status_code=401,
            content=error_response(ERROR_UNAUTHORIZED, str(e))
        )


@router.post("/login")
async def login(request: Request, body: LoginRequest):
    """Authenticate user and return JWT."""
    try:
        result = await get_services().auth.login(
            email=body.email,
            password=body.password
        )
        response = JSONResponse(
            content=success_response({
                "access_token": result["access_token"],
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "username": result["username"],
                "plan": result["plan"]
            })
        )
        return set_refresh_cookie(response, result["refresh_token"])
    except ValueError as e:
        return JSONResponse(
            status_code=401,
            content=error_response(ERROR_UNAUTHORIZED, "Invalid credentials")
        )


@router.post("/refresh")
async def refresh(request: Request):
    """Refresh access token using refresh token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        return JSONResponse(
            status_code=401,
            content=error_response(ERROR_UNAUTHORIZED, "No refresh token")
        )

    try:
        result = await get_services().auth.refresh(refresh_token)
        response = JSONResponse(
            content=success_response({
                "access_token": result["access_token"],
                "expires_in": 900
            })
        )
        return set_refresh_cookie(response, result["refresh_token"])
    except ValueError as e:
        return JSONResponse(
            status_code=401,
            content=error_response(ERROR_UNAUTHORIZED, str(e))
        )


@router.post("/logout")
async def logout(request: Request, user: CurrentUser = Depends(get_current_user)):
    """Logout user and blacklist JWT."""
    try:
        jti = user.jti
        exp = 900
        await get_services().auth.logout(user.user_id, jti, exp)
        response = JSONResponse(
            content=success_response({"message": "Logged out."})
        )
        response.delete_cookie("refresh_token")
        return response
    except Exception as e:
        return JSONResponse(
            content=error_response(ERROR_UNAUTHORIZED, str(e))
        )


@router.get("/csrf")
async def get_csrf(request: Request):
    """Get CSRF token for session."""
    token = await get_services().auth.get_csrf_token(request)
    return success_response({"token": token})


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(body: ForgotPasswordRequest):
    """Send password reset email."""
    await get_services().auth.forgot_password(body.email)
    return success_response({
        "message": "If that email exists, you'll receive a reset link."
    })


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    """Reset password using token."""
    try:
        await get_services().auth.reset_password(body.token, body.new_password)
        return success_response({"message": "Password updated."})
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, str(e))
        )


@router.get("/check-username")
async def check_username(username: str):
    """Check if username is available."""
    available = await get_services().auth.check_username(username)
    return success_response({"available": available})


@router.get("/validate-beta-code")
async def validate_beta_code(code: str):
    """Validate a beta code before registration."""
    is_valid, error_msg = await get_services().auth.is_valid_beta_code(code)
    if is_valid:
        return success_response({"valid": True, "message": "Beta code is valid"})
    return JSONResponse(
        status_code=400,
        content=error_response("INVALID_BETA_CODE", error_msg)
    )