"""Insights API endpoint for chat with LLM."""

import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Any, AsyncGenerator, Optional

import aiohttp
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.dependencies.auth import CurrentUser, get_current_user
from core.database import get_db
from core.redis_bus import get_redis

logger = logging.getLogger("api.routes.insights")

router = APIRouter(prefix="/insights", tags=["insights"])

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    question: str
    symbol: str


class InsightsLatestResponse(BaseModel):
    """Response model for latest insight."""
    type: str = Field(default="llm_insight")
    source: str
    document_type: str
    entity: str
    summary: str
    causal_chain: dict
    affected_assets: list
    source_sentence: str
    timestamp: str


class InsightsHistoryItem(BaseModel):
    """Response model for insight history."""
    id: int
    symbol: str
    timestamp: datetime
    insight_type: str
    content: str
    confidence: Optional[float] = None
    source: Optional[str] = None
    entities: Optional[list] = None


class SummaryResponse(BaseModel):
    """Response model for summary."""
    summary: str
    timestamp: str


async def _fetch_context(
    symbol: str,
    redis
) -> dict[str, Any]:
    """Fetch all context data in parallel."""
    regime_data, micro_data, confluence_data = await asyncio.gather(
        redis.get_latest(f"regime:{symbol}"),
        redis.get_latest(f"microstructure:{symbol}"),
        redis.get_latest("altdata:confluence"),
        return_exceptions=True
    )

    try:
        insights_raw = await redis.redis.xrevrange(
            "llm:insights", "+", "-", count=3
        )
    except Exception:
        insights_raw = []

    insights = []
    for msg_id, fields in insights_raw:
        try:
            data = json.loads(fields.get("data", "{}"))
            insights.append(data.get("summary", ""))
        except Exception:
            continue

    return {
        "regime": regime_data if not isinstance(regime_data, Exception) else None,
        "micro": micro_data if not isinstance(micro_data, Exception) else None,
        "confluence": confluence_data if not isinstance(confluence_data, Exception) else None,
        "insights": insights
    }


def _build_system_message(
    symbol: str,
    context: dict[str, Any]
) -> str:
    """Build system message with injected market context."""
    regime = context.get("regime", {})
    micro = context.get("micro", {})
    confluence = context.get("confluence", {})
    insights = context.get("insights", [])

    regime_str = regime.get("regime", "unknown")
    confidence = regime.get("confidence", 0.0)

    vpin = micro.get("vpin", 0.0)
    if vpin < 0.3:
        toxicity_label = "low"
    elif vpin < 0.6:
        toxicity_label = "moderate"
    else:
        toxicity_label = "high"

    ofi = micro.get("ofi_ma_10", 0.0)
    ofi_label = "bullish" if ofi > 0 else "bearish"

    conf_score = confluence.get("score", 0.0)
    conf_dir = confluence.get("direction", "neutral")

    insights_str = "; ".join(insights[-3:]) if insights else "No recent insights"

    return f"""You are a market intelligence assistant for VektorLabs. Answer questions about the current market using the provided context. Be specific and cite the data. Do not give financial advice.
Current market context:
- {symbol} regime: {regime_str} (confidence: {confidence*100:.0f}%)
- VPIN: {vpin:.2f} (toxicity_label: {toxicity_label})
- OFI: {ofi:.2f} ({ofi_label})
- Alt data confluence: {conf_score:.2f} ({conf_dir})
- Recent insights: {insights_str}"""


async def _stream_openrouter(
    question: str,
    system_message: str,
    api_key: str
) -> AsyncGenerator[str, None]:
    """Call OpenRouter with streaming and yield SSE chunks."""
    model = os.getenv("LLM_MODEL", "anthropic/claude-3-haiku")

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": question}
    ]

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                OPENROUTER_URL,
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True
                },
                headers={"Authorization": f"Bearer {api_key}"}
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    yield f"data: {{\"type\": \"error\", \"message\": \"OpenRouter error: {resp.status}\"}}\n\n"
                    return

                async for line in resp.content:
                    line = line.decode("utf-8").strip()
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            yield "data: [DONE]\n\n"
                            break
                        yield f"data: {data}\n\n"

        except asyncio.TimeoutError:
            yield "data: {\"type\": \"error\", \"message\": \"Request timeout\"}\n\n"
        except Exception as e:
            yield f"data: {{\"type\": \"error\", \"message\": \"{str(e)}\"}}\n\n"


@router.post("/chat")
async def chat(
    request: ChatRequest,
    user: CurrentUser = Depends(get_current_user),
    redis=Depends(get_redis)
) -> StreamingResponse:
    """Chat endpoint with SSE streaming."""
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM service not configured"
        )

    symbol = request.symbol.upper()
    if symbol not in user.symbols:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Symbol {symbol} not in watched list"
        )

    context = await _fetch_context(symbol, redis)

    regime = context.get("regime", {})
    vpin = context.get("micro", {}).get("vpin", 0.0)
    conf_score = context.get("confluence", {}).get("score", 0.0)
    insights_count = len(context.get("insights", []))

    context_event = {
        "type": "context",
        "regime": regime.get("regime", "unknown"),
        "vpin": vpin,
        "confluence": conf_score,
        "insights_count": insights_count
    }

    system_message = _build_system_message(symbol, context)

    async def event_generator() -> AsyncGenerator[str, None]:
        yield f"data: {json.dumps(context_event)}\n\n"

        try:
            async for chunk in _stream_openrouter(
                request.question,
                system_message,
                api_key
            ):
                yield chunk
        except Exception as e:
            logger.error(f"Chat error: {e}")
            yield f"data: {{\"type\": \"error\", \"message\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@router.get(
    "/latest",
    response_model=InsightsLatestResponse,
    summary="Get latest insight",
    description="Returns the most recent LLM insight."
)
async def get_latest(
    user: CurrentUser = Depends(get_current_user),
    redis=Depends(get_redis)
) -> InsightsLatestResponse:
    """Get latest insight from Redis."""
    data = await redis.get_latest("llm:insights")

    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No insights available yet"
        )

    return InsightsLatestResponse(**data)


@router.get(
    "/history",
    response_model=list[InsightsHistoryItem],
    summary="Get insight history",
    description="Returns historical insights from database."
)
async def get_history(
    source: Optional[str] = None,
    start: str = "",
    end: str = "",
    user: CurrentUser = Depends(get_current_user),
    db=Depends(get_db)
) -> list[InsightsHistoryItem]:
    """Get insight history from database."""
    query = "SELECT * FROM llm_insights WHERE 1=1"
    params: list[Any] = []

    if source:
        query += " AND source = $1"
        params.append(source)

    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            query += " AND timestamp >= $" + str(len(params) + 1)
            params.append(start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start timestamp format"
            )

    if end:
        try:
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
            query += " AND timestamp <= $" + str(len(params) + 1)
            params.append(end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end timestamp format"
            )

    query += " ORDER BY timestamp DESC"

    rows = await db.fetch(query, *params)

    if not rows:
        return []

    results = []
    for row in rows:
        results.append(InsightsHistoryItem(
            id=row["id"],
            symbol=row.get("symbol", "UNKNOWN"),
            timestamp=row["timestamp"],
            insight_type=row.get("insight_type", "causal"),
            content=row.get("content", ""),
            confidence=row.get("confidence"),
            source=row.get("source"),
            entities=row.get("entities"),
        ))

    return results


@router.get(
    "/summary",
    response_model=SummaryResponse,
    summary="Get market summary",
    description="Returns the latest market summary from LLM."
)
async def get_summary(
    user: CurrentUser = Depends(get_current_user),
    redis=Depends(get_redis)
) -> SummaryResponse:
    """Get summary from Redis key."""
    data = await redis.redis.get("llm:summary")

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No summary generated yet"
        )

    summary_data = json.loads(data)

    return SummaryResponse(
        summary=summary_data.get("summary", ""),
        timestamp=summary_data.get("timestamp", "")
    )