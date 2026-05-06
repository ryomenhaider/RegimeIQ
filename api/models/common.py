"""Common models - shared Pydantic models and helper functions."""

from pydantic import BaseModel, field_validator
from typing import Any, Optional, List
from datetime import datetime, timezone


ERROR_VALIDATION_ERROR = "VALIDATION_ERROR"
ERROR_UNAUTHORIZED = "UNAUTHORIZED"
ERROR_TOKEN_EXPIRED = "TOKEN_EXPIRED"
ERROR_FORBIDDEN = "FORBIDDEN"
ERROR_NOT_FOUND = "NOT_FOUND"
ERROR_SYMBOL_LIMIT_REACHED = "SYMBOL_LIMIT_REACHED"
ERROR_INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
ERROR_RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
ERROR_PAYMENT_REQUIRED = "PAYMENT_REQUIRED"
ERROR_INTERNAL_ERROR = "INTERNAL_ERROR"


class ResponseMeta(BaseModel):
    timestamp: str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    request_id: Optional[str] = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    fields: Optional[dict[str, str]] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail
    meta: ResponseMeta


class SuccessResponse(BaseModel):
    success: bool = True
    data: Any
    meta: ResponseMeta


class HealthCheckResponse(BaseModel):
    status: str
    service: str
    version: str
    latency_ms: Optional[float] = None


class PaginatedResponse(BaseModel):
    data: List[Any]
    total: int
    page: int
    page_size: int
    has_more: bool


class MetricsResponse(BaseModel):
    mrr: float
    arr: float
    churn_rate: float
    active_users: int
    total_users: int
    new_users_30d: int
    new_subscribers_30d: int
    avg_arpu: float
    ltv: float
    cac: float
    paying_subscribers: int
    free_subscribers: int
    basic_subscribers: int
    pro_subscribers: int
    computed_at: datetime


def success_response(data: Any, request_id: Optional[str] = None) -> dict:
    return SuccessResponse(
        success=True,
        data=data,
        meta=ResponseMeta(
            timestamp=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            request_id=request_id
        )
    ).model_dump(exclude_none=True)


def error_response(
    code: str,
    message: str,
    fields: Optional[dict[str, str]] = None,
    request_id: Optional[str] = None
) -> dict:
    return ErrorResponse(
        success=False,
        error=ErrorDetail(
            code=code,
            message=message,
            fields=fields
        ),
        meta=ResponseMeta(
            timestamp=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            request_id=request_id
        )
    ).model_dump(exclude_none=True)


def validation_error_response(
    errors: list[dict],
    request_id: Optional[str] = None
) -> dict:
    fields = {}
    for err in errors:
        loc = ".".join(str(x) for x in err.get("loc", []))
        msg = err.get("msg", "")
        fields[loc] = msg

    return error_response(
        code=ERROR_VALIDATION_ERROR,
        message="Validation failed",
        fields=fields,
        request_id=request_id
    )