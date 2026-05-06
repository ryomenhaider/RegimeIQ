"""Prometheus metrics configuration."""

import asyncio
import logging
from typing import Optional

from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST

logger = logging.getLogger(__name__)


http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status_code"]
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration",
    ["path"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

websocket_connections_active = Gauge(
    "websocket_connections_active",
    "Number of active WebSocket connections"
)

redis_stream_lag = Gauge(
    "redis_stream_lag",
    "Redis stream lag (messages behind)",
    ["stream_key"]
)

circuit_breaker_state = Gauge(
    "circuit_breaker_state",
    "Circuit breaker state (0=closed, 1=open, 2=half_open)",
    ["service"]
)


def record_request(method: str, path: str, status: int) -> None:
    """Record HTTP request to metrics."""
    http_requests_total.labels(method=method, path=path, status_code=str(status)).inc()


def record_request_duration(path: str, duration_seconds: float) -> None:
    """Record request duration to metrics."""
    http_request_duration_seconds.labels(path=path).observe(duration_seconds)


def increment_websocket_connections() -> None:
    """Increment active WebSocket connections."""
    websocket_connections_active.inc()


def decrement_websocket_connections() -> None:
    """Decrement active WebSocket connections."""
    websocket_connections_active.dec()


async def update_redis_stream_lag(redis, stream_keys: list[str]) -> None:
    """Update Redis stream lag in background."""
    while True:
        try:
            for stream_key in stream_keys:
                try:
                    xlen = redis.xlen(stream_key)
                    redis_stream_lag.labels(stream_key=stream_key).set(xlen)
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Error updating stream lag: {e}")
        
        await asyncio.sleep(30)


def set_circuit_breaker_state(service: str, state: int) -> None:
    """Set circuit breaker state (0=closed, 1=open, 2=half_open)."""
    circuit_breaker_state.labels(service=service).set(state)


class MetricsMiddleware:
    """Middleware to record metrics on requests."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        path = scope.get("path", "/")
        
        method = scope.get("method", "GET")

        await self.app(scope, receive, send)
        
        status = 200
        for header_name, header_value in scope.get("headers", []):
            if header_name == b"status":
                status = int(header_value)
                break

        record_request(method, path, status)

        return await self.app(scope, receive, send)


def get_metrics() -> bytes:
    """Get Prometheus metrics output."""
    return generate_latest()


def get_content_type() -> str:
    """Get Prometheus content type."""
    return CONTENT_TYPE_LATEST