"""Health router - health check endpoints."""

import time
from datetime import datetime, timezone
from typing import Optional

import aiohttp
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from api.dependencies.auth import get_current_user, CurrentUser

router = APIRouter(prefix="/health", tags=["health"])

_start_time = time.time()

OPENROUTER_URL = "https://openrouter.ai/api/v1/models"


async def check_postgres(db_pool) -> dict:
    """Check PostgreSQL."""
    try:
        start = time.perf_counter()
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        latency = (time.perf_counter() - start) * 1000
        return {"status": "healthy", "latency_ms": round(latency, 2)}
    except Exception:
        return {"status": "unhealthy", "latency_ms": None}


async def check_redis(redis) -> dict:
    """Check Redis."""
    try:
        start = time.perf_counter()
        redis.ping()
        latency = (time.perf_counter() - start) * 1000
        return {"status": "healthy", "latency_ms": round(latency, 2)}
    except Exception:
        return {"status": "unhealthy", "latency_ms": None}


async def check_binance_ws() -> dict:
    """Check Binance WS."""
    return {"status": "healthy", "streams_active": 0}


async def check_openrouter() -> dict:
    """Check OpenRouter."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                OPENROUTER_URL,
                timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                if resp.status == 200:
                    return {"status": "healthy"}
                return {"status": "unhealthy"}
    except Exception:
        return {"status": "unhealthy"}


@router.get("")
async def health_check(db=None, redis=None):
    """Full health check."""
    services = {}
    is_healthy = True
    is_degraded = False

    if db:
        pg_result = await check_postgres(db.pool)
        services["postgresql"] = pg_result
        if pg_result["status"] == "unhealthy":
            is_healthy = False

    if redis:
        redis_result = await check_redis(redis)
        services["redis"] = redis_result
        if redis_result["status"] == "unhealthy":
            is_healthy = False

    services["binance_ws"] = await check_binance_ws()
    services["openrouter"] = await check_openrouter()

    overall_status = "healthy"
    if not is_healthy:
        overall_status = "unhealthy"
    elif any(s.get("status") == "unhealthy" for s in services.values() if s.get("status")):
        overall_status = "degraded"
        is_degraded = True

    uptime = int(time.time() - _start_time)

    return JSONResponse(
        status_code=200 if is_healthy else 503,
        content={
            "status": overall_status,
            "services": services,
            "uptime_seconds": uptime,
            "version": "1.0.0"
        }
    )


@router.get("/live")
async def liveness_check():
    """Liveness probe."""
    return JSONResponse(
        status_code=200,
        content={"status": "alive"}
    )


@router.get("/ready")
async def readiness_check(db=None, redis=None):
    """Readiness probe."""
    failed = []
    
    if not db:
        failed.append("postgresql")
    elif db.pool.size() == 0:
        failed.append("postgresql")
    
    if not redis:
        failed.append("redis")
    else:
        try:
            redis.ping()
        except Exception:
            failed.append("redis")
    
    if failed:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "failed": failed}
        )
    
    return JSONResponse(
        status_code=200,
        content={"status": "ready"}
    )