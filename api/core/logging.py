"""Structured logging with JSON output."""

import json
import logging
import os
import re
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Optional

request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar("user_id", default=None)

JSON_LOGGER_AVAILABLE = False
try:
    from pythonjsonlogger import jsonlogger
    JSON_LOGGER_AVAILABLE = True
except ImportError:
    jsonlogger = None


class VektorJsonFormatter:
    """Custom JSON formatter with request context - fallback implementation."""

    def __init__(self, fmt: str = None):
        self.fmt = fmt

    def format(self, record: logging.LogRecord) -> str:
        request_id = request_id_var.get()
        user_id = user_id_var.get()
        
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "message": record.getMessage(),
        }
        
        if request_id:
            log_data["request_id"] = request_id
        if user_id:
            log_data["user_id"] = user_id
        if hasattr(record, "method"):
            log_data["method"] = record.method
        if hasattr(record, "path"):
            log_data["path"] = record.path
        if hasattr(record, "status"):
            log_data["status"] = record.status
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        
        return json.dumps(log_data)


class StandardFormatter(logging.Formatter):
    """Standard formatter fallback."""

    def format(self, record: logging.LogRecord) -> str:
        request_id = request_id_var.get()
        user_id = user_id_var.get()
        
        parts = [
            datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            record.levelname,
        ]
        
        if request_id:
            parts.append(f"reqid={request_id}")
        if user_id:
            parts.append(f"user={user_id}")
        
        if hasattr(record, "method"):
            parts.append(f"method={record.method}")
        if hasattr(record, "path"):
            parts.append(f"path={record.path}")
        if hasattr(record, "status"):
            parts.append(f"status={record.status}")
        if hasattr(record, "duration_ms"):
            parts.append(f"duration={record.duration_ms}ms")
        
        parts.append(record.getMessage())
        
        return " ".join(parts)


def configure_logging() -> None:
    """Configure structured logging."""
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG if os.getenv("ENVIRONMENT") != "production" else logging.INFO)
    
    handler = logging.StreamHandler()
    
    if JSON_LOGGER_AVAILABLE and jsonlogger:
        formatter = VektorJsonFormatter(
            "%(timestamp)s %(level)s %(request_id)s %(user_id)s %(method)s %(path)s %(status)s %(duration_ms)s %(message)s"
        )
    else:
        formatter = StandardFormatter()
    
    handler.setFormatter(formatter)
    
    logger.handlers.clear()
    logger.addHandler(handler)
    
    logger.info("Logging configured")


def get_logger(name: str) -> logging.Logger:
    """Get logger for module."""
    return logging.getLogger(name)


def set_request_id(request_id: str) -> None:
    """Set request ID in context."""
    request_id_var.set(request_id)


def set_user_id(user_id: str) -> None:
    """Set user ID in context."""
    user_id_var.set(user_id)


SENSITIVE_PATTERNS = [
    (r"password=([^&\s]+)", "password=***"),
    (r"token=([^&\s]+)", "token=***"),
    (r"api[_-]?key=([^&\s]+)", "api_key=***"),
    (r"secret=([^&\s]+)", "secret=***"),
    (r"Bearer\s+([A-Za-z0-9\-_.]+)", "Bearer ***"),
]


def sanitize_log_message(message: str) -> str:
    """Remove sensitive data from log messages."""
    result = message
    for pattern, replacement in SENSITIVE_PATTERNS:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    return result


def log_request(
    method: str,
    path: str,
    status: int,
    duration_ms: float,
    request_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> None:
    """Log HTTP request."""
    logger = logging.getLogger("vektorlabs")
    
    extra = {
        "method": method,
        "path": path,
        "status": status,
        "duration_ms": round(duration_ms, 2)
    }
    
    if request_id:
        extra["request_id"] = request_id
    if user_id:
        extra["user_id"] = user_id
    
    logger.info(f"{method} {path} - {status} ({duration_ms:.2f}ms)", extra=extra)


def log_websocket_connect(username: str, request_id: Optional[str] = None) -> None:
    """Log WebSocket connect."""
    logger = logging.getLogger("vektorlabs")
    extra = {"request_id": request_id} if request_id else {}
    logger.info(f"WebSocket connected: {username}", extra=extra)


def log_websocket_disconnect(username: str, duration: float, request_id: Optional[str] = None) -> None:
    """Log WebSocket disconnect."""
    logger = logging.getLogger("vektorlabs")
    extra = {"duration_ms": round(duration * 1000, 2)}
    if request_id:
        extra["request_id"] = request_id
    logger.info(f"WebSocket disconnected: {username} ({duration:.1f}s)", extra=extra)


def log_security_event(event: str, user_id: Optional[str] = None, details: Optional[dict] = None) -> None:
    """Log security event."""
    logger = logging.getLogger("vektorlabs")
    extra = {"security_event": event}
    if user_id:
        extra["user_id"] = user_id
    if details:
        extra["details"] = json.dumps(details)
    logger.critical(f"Security event: {event}", extra=extra)


def log_circuit_breaker(service: str, state: str) -> None:
    """Log circuit breaker state change."""
    level = logging.WARNING if state == "open" else logging.INFO
    logger = logging.getLogger("vektorlabs")
    logger.log(level, f"Circuit breaker {service}: {state}", extra={"service": service, "state": state})


def log_rate_limit_exceeded(user_id: str, limit: int) -> None:
    """Log rate limit exceeded."""
    logger = logging.getLogger("vektorlabs")
    logger.warning(f"Rate limit exceeded for {user_id}: {limit}", extra={"user_id": user_id, "limit": limit})