"""VektorLabs FastAPI main application."""

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from api.models.common import validation_error_response

from api.middleware import (
    RequestIDMiddleware,
    HTTPSRedirectMiddleware,
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    RequestLoggingMiddleware,
    CSRFMiddleware,
)
from api.routers import (
    auth_router,
    users_router,
    symbols_router,
    regime_router,
    microstructure_router,
    altdata_router,
    insights_router,
    backtest_router,
    payment_router,
    admin_router,
    health_router,
)
from api.services.websocket import WebSocketManager

logger = logging.getLogger(__name__)

ws_manager = WebSocketManager()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan handler."""
    logger.info("Starting VektorLabs API...")

    from core.database import get_db, init_db
    from core.redis_bus import get_redis, init_redis

    try:
        db = get_db()
        logger.info("Database connected")
    except Exception as e:
        logger.warning(f"Database not available: {e}")
        db = None

    try:
        redis = get_redis()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis not available: {e}")
        redis = None

    try:
        from api.services.factory import init_services
        init_services(db, redis)
        logger.info("API services initialized")
    except Exception as e:
        logger.warning(f"API services not initialized: {e}")

    try:
        await ws_manager.start()
        logger.info("WebSocket manager started")
    except Exception as e:
        logger.warning(f"WebSocket manager not started: {e}")

    logger.info("VektorLabs API started. Version 1.0.0")

    yield

    logger.info("Shutting down VektorLabs API...")
    await ws_manager.stop()
    logger.info("VektorLabs API stopped.")


app = FastAPI(
    title="VektorLabs API",
    version="1.0.0",
    docs_url=None if os.getenv("ENVIRONMENT") == "production" else "/docs",
    redoc_url=None if os.getenv("ENVIRONMENT") == "production" else "/redoc",
    lifespan=lifespan,
)

app.add_middleware(RequestIDMiddleware)
if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=600,
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred."
            },
            "meta": {
                "timestamp": getattr(request.state, "timestamp", ""),
                "request_id": getattr(request.state, "request_id", "")
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom validation exception handler - returns 400 with envelope."""
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=400,
        content=validation_error_response(
            errors=exc.errors(),
            request_id=request_id
        )
    )


app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(symbols_router, prefix="/api")
app.include_router(regime_router, prefix="/api")
app.include_router(microstructure_router, prefix="/api")
app.include_router(altdata_router, prefix="/api")
app.include_router(insights_router, prefix="/api")
app.include_router(backtest_router, prefix="/api")
app.include_router(payment_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(health_router, prefix="/api")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for realtime data."""
    await ws_manager.handle_connection(websocket)


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    from api.core.metrics import get_metrics, get_content_type
    from fastapi.responses import Response
    return Response(content=get_metrics(), media_type=get_content_type())


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "VektorLabs API",
        "version": "1.0.0",
        "docs": "/docs" if os.getenv("ENVIRONMENT") != "production" else None
    }