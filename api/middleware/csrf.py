"""CSRF protection middleware."""

import hmac
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


EXEMPT_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/admin-login",
    "/api/auth/csrf",
    "/api/auth/refresh",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/performance/log",
}


class CSRFMiddleware(BaseHTTPMiddleware):
    """Validate CSRF tokens for state-changing operations."""

    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self.redis = redis_client

    def _get_session_id(self, request: Request) -> Optional[str]:
        import hashlib
        refresh_token = request.cookies.get("refresh_token")
        if refresh_token:
            return hashlib.sha256(refresh_token.encode()).hexdigest()[:32]
        return None

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        if request.method in ("GET", "HEAD", "OPTIONS"):
            return await call_next(request)

        if path in EXEMPT_PATHS or path.startswith("/api/auth/refresh") or path.startswith("/api/payment/webhook") or path.startswith("/api/admin/") or request.method == "OPTIONS":
            return await call_next(request)

        csrf_token = request.headers.get("X-CSRF-Token")
        session_id = self._get_session_id(request)

        if not self.redis:
            return await call_next(request)

        if not csrf_token or not session_id:
            return JSONResponse(
                status_code=403,
                content={
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "CSRF token required."
                    },
                    "meta": {
                        "timestamp": getattr(request.state, "timestamp", ""),
                        "request_id": getattr(request.state, "request_id", "")
                    }
                }
            )

        stored_token = None
        try:
            if self.redis:
                stored_token = await self.redis.get(f"csrf:{session_id}")
        except Exception:
            pass

        if not stored_token or not hmac.compare_digest(csrf_token, stored_token):
            return JSONResponse(
                status_code=403,
                content={
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Invalid CSRF token."
                    },
                    "meta": {
                        "timestamp": getattr(request.state, "timestamp", ""),
                        "request_id": getattr(request.state, "request_id", "")
                    }
                }
            )

        return await call_next(request)

    @staticmethod
    def generate_token() -> str:
        """Generate a CSRF token."""
        import os
        return os.urandom(32).hex()

    @staticmethod
    def store_token(redis, session_id: str, token: str, ttl: int = 86400) -> None:
        """Store CSRF token in Redis."""
        try:
            redis.setex(f"csrf:{session_id}", ttl, token)
        except Exception:
            pass