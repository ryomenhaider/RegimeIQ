"""Insights router - LLM insights endpoints."""

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import aiohttp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_NOT_FOUND, ERROR_RATE_LIMIT_EXCEEDED
from api.services.insights import InsightsService

logger = logging.getLogger("api.routes.insights")

router = APIRouter(prefix="/insights", tags=["insights"])

insights_service = InsightsService()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")


class ChatRequest(BaseModel):
    question: str = Field(..., max_length=500)
    symbol: str


async def generate_chat_stream(question: str, symbol: str, context: dict):
    """Stream OpenRouter responses."""
    try:
        system_prompt = f"""You are a crypto market analyst. Use the following context to answer the user's question.

Current Regime: {context.get('regime', {})}
Microstructure: {context.get('microstructure', {})}
Confluence: {context.get('confluence', {})}
Recent Insights: {context.get('recent_insights', [])}

Question: {question}

Provide a brief, actionable analysis."""

        async with aiohttp.ClientSession() as session:
            payload = {
                "model": "anthropic/claude-3-haiku",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                "stream": True
            }
            
            headers = {
                "Authorization": f"Bearer {OPENROUTER_KEY}",
                "Content-Type": "application/json"
            }
            
            async with session.post(
                OPENROUTER_URL,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status != 200:
                    yield "data: {\"type\": \"error\", \"message\": \"Failed to get response.\"}\n\n"
                    return
                
                async for line in resp.content:
                    if line:
                        decoded = line.decode("utf-8")
                        if decoded.startswith("data: "):
                            yield decoded + "\n"
                
                yield "data: {\"type\": \"done\"}\n\n"
    
    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        yield f"data: {{\"type\": \"error\", \"message\": \"{str(e)}\"}}\n\n"


@router.get("/latest")
async def get_latest(
    limit: int = 10,
    source: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user)
):
    """Get latest insights."""
    limit = min(limit, 50)
    insights = await insights_service.get_latest(limit, source)
    return success_response({"insights": insights})


@router.get("/history")
async def get_history(
    from_ts: Optional[str] = None,
    to: Optional[str] = None,
    asset: Optional[str] = None,
    limit: int = 100,
    user: CurrentUser = Depends(get_current_user)
):
    """Get insight history."""
    start = None
    end = None
    
    if from_ts:
        try:
            start = datetime.fromisoformat(from_ts.replace("Z", "+00:00"))
        except Exception:
            pass
    
    if to:
        try:
            end = datetime.fromisoformat(to.replace("Z", "+00:00"))
        except Exception:
            pass
    
    insights = await insights_service.get_history(start, end, asset, limit)
    return success_response({"insights": insights})


@router.get("/summary")
async def get_summary(user: CurrentUser = Depends(get_current_user)):
    """Get market summary."""
    summary = await insights_service.get_summary()
    if not summary:
        return JSONResponse(
            status_code=404,
            content=error_response(ERROR_NOT_FOUND, "No summary available")
        )
    return success_response(summary)


@router.post("/chat")
async def chat(
    request: Request,
    user: CurrentUser = Depends(get_current_user)
):
    """Chat with LLM using RAG context."""
    body = await request.json()
    question = body.get("question", "")
    symbol = body.get("symbol", "BTCUSDT").upper()
    
    has_quota = await insights_service.check_chat_limit(user.username, user.plan)
    if not has_quota:
        return JSONResponse(
            status_code=429,
            content=error_response(
                ERROR_RATE_LIMIT_EXCEEDED,
                "Daily chat limit reached. Upgrade for more queries."
            )
        )
    
    context = await insights_service.build_rag_context(symbol)
    
    first_event = {
        "type": "context",
        "regime": context.get("regime"),
        "confluence": context.get("confluence"),
        "insights_count": len(context.get("recent_insights", []))
    }
    
    await insights_service.increment_chat_limit(user.username)
    
    async def event_generator():
        yield f"data: {json.dumps(first_event)}\n\n"
        async for chunk in generate_chat_stream(question, symbol, context):
            yield chunk
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )