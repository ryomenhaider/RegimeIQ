"""Request logging middleware - structured JSON logging."""

import logging
import time
import json
import base64
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


def parse_jwt_sub(token: str) -> str:
    """Parse JWT sub claim without verification (for logging only)."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return "anonymous"
        payload = parts[1]
        padding = "=" * (4 - len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload + padding)
        data = json.loads(decoded)
        return data.get("sub") or data.get("username") or "anonymous"
    except Exception:
        return "anonymous"


SENSITIVE_HEADERS = {
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
    "password",
    "secret",
}


def sanitize_headers(headers: dict) -> dict:
    """Remove sensitive headers from logs."""
    return {
        k: "***REDACTED***" if k.lower() in SENSITIVE_HEADERS else v
        for k, v in headers.items()
    }


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Structured JSON request/response logging."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        request_id = getattr(request.state, "request_id", "")

        auth_header = request.headers.get("Authorization", "")
        user_id = parse_jwt_sub(auth_header.split(" ", 1)[1]) if auth_header.startswith("Bearer ") else "anonymous"

        logger.info(
            json.dumps({
                "level": "INFO",
                "request_id": request_id,
                "type": "request_start",
                "method": request.method,
                "path": request.url.path,
                "user_id": user_id,
                "client_ip": request.client.host if request.client else None,
                "headers": sanitize_headers(dict(request.headers)),
            })
        )

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000

        logger.info(
            json.dumps({
                "level": "INFO",
                "request_id": request_id,
                "type": "request_end",
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "user_id": user_id,
            })
        )

        return response