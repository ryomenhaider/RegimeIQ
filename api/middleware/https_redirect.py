"""HTTPS redirect middleware - redirects HTTP to HTTPS in production."""

import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Redirect all HTTP requests to HTTPS in production."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if os.getenv("ENVIRONMENT") == "production":
            if request.url.scheme == "http":
                https_url = request.url.replace(scheme="https")
                return RedirectResponse(url=str(https_url), status_code=301)
        return await call_next(request)