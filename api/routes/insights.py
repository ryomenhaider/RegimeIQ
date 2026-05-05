"""Insights API endpoint for chat with LLM."""

import asyncio
import json
import logging
import os
from typing import Any, AsyncGenerator

import aiohttp
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.dependencies.auth import CurrentUser, get_current_user
from core.redis_bus import get_redis

logger = logging.getLogger("api.routes.insights")

router = APIRouter(prefix="/insights", tags=["insights"])

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    question: str
    symbol: str


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