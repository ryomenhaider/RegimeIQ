"""Rate limit dependency."""

import time
from collections import defaultdict
from threading import Lock
from fastapi import Depends, HTTPException, Request


class RateLimiter:
    """Rate limiter for endpoints."""

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self._requests = defaultdict(list)
        self._lock = Lock()

    def _get_key(self, request: Request) -> str:
        if hasattr(request.state, "user"):
            return f"user:{request.state.user.username}"
        return f"ip:{request.client.host}"

    def _is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = now - 60

        with self._lock:
            self._requests[key] = [
                t for t in self._requests[key] if t > window_start
            ]
            if len(self._requests[key]) >= self.requests_per_minute:
                return False
            self._requests[key].append(now)
            return True

    def __call__(self, request: Request):
        key = self._get_key(request)
        if not self._is_allowed(key):
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded"
            )
        return True


def get_rate_limiter() -> RateLimiter:
    """Get rate limiter instance."""
    return RateLimiter()