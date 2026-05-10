"""Rate limiting middleware - Redis-based sliding window rate limiting."""

import logging
import os
import time
from urllib.parse import unquote
import json
import base64
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)


RATE_LIMITS = {
    "POST:/auth/login": {"limit": 10, "window": 60},
    "POST:/auth/register": {"limit": 5, "window": 3600},
    "GET:/regime": {"limit": 300, "window": 60},
    "GET:/microstructure": {"limit": 300, "window": 60},
    "POST:/backtest/run": {"limit": 10, "window": 3600},
    "GET:/admin": {"limit": 100, "window": 60},
    "PUT:/users": {"limit": 60, "window": 60},
    "GET:/": {"limit": 600, "window": 60},
}


def parse_jwt_sub(token: str) -> Optional[str]:
    """Parse JWT sub claim without verification (for rate limiting only)."""
    try:
        import json
        import base64
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64 = parts[0]
        padding = "=" * (4 - len(payload_b64) % 4)
        decoded = base64.urlsafe_b64decode(payload_b64 + padding)
        data = json.loads(decoded)
        return data.get("sub") or data.get("username")
    except Exception:
        return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Redis sliding window rate limiting."""

    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self.redis = redis_client

    def _get_limits(self, method: str, path: str) -> tuple[int, int]:
        for pattern, limits in RATE_LIMITS.items():
            ep_method, ep_path = pattern.split(":", 1)
            if method == ep_method and path.startswith(ep_path):
                return limits["limit"], limits["window"]
        return 100, 60

    def _get_user_id(self, auth_header: str) -> Optional[str]:
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        try:
            from api.services.auth import AuthService
            auth_service = AuthService()
            token = auth_header.split(" ", 1)[1]
            payload = auth_service.verify_access_token(token)
            if payload:
                return f"user:{payload.get('sub')}"
            return None
        except Exception:
            return None

    async def dispatch(self, request: Request, call_next) -> Response:
        method = request.method
        path = unquote(request.url.path)

        auth_header = request.headers.get("Authorization", "")
        user_id = self._get_user_id(auth_header)

        if not user_id:
            user_id = f"ip:{request.client.host}" if request.client else "ip:unknown"

        endpoint_group = f"{method}:{path.split('/')[1]}" if len(path.split("/")) > 2 else f"{method}:/"

        limit, window = self._get_limits(method, path)
        now = time.time()
        window_start = int(now // window) * window
        key = f"ratelimit:{user_id}:{endpoint_group}:{window_start}"

        try:
            if self.redis:
                current = await self.redis.incr(key)
                if current == 1:
                    await self.redis.expire(key, window)
                remaining = max(0, limit - current)
                reset_time = int(window_start + window)
            else:
                current = 1
                remaining = limit - 1
                reset_time = int(window_start + window)
        except Exception as e:
            logger.warning(f"Redis rate limit error: {e}")
            return await call_next(request)

        if current > limit:
            response = JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please try again later."
                    },
                    "meta": {
                        "timestamp": getattr(request.state, "timestamp", ""),
                        "request_id": getattr(request.state, "request_id", "")
                    }
                },
                headers={
                    "Retry-After": str(int(window_start + window - now)),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time)
                }
            )
            return response

        response = await call_next(request)

        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)

        return response