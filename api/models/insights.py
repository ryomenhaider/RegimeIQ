"""Insights models - Pydantic models for LLM insights."""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    stream: bool = False


class CausalInsight(BaseModel):
    type: str
    source: str
    document_type: Optional[str] = None
    entity: Optional[str] = None
    summary: str
    causal_chain: List[str]
    affected_assets: List[str]
    source_sentence: str
    timestamp: datetime


class InsightsLatestResponse(BaseModel):
    type: str
    source: str
    document_type: Optional[str] = None
    entity: Optional[str] = None
    summary: str
    causal_chain: List[str]
    affected_assets: List[str]
    source_sentence: str
    timestamp: datetime


class InsightsHistoryItem(BaseModel):
    id: int
    symbol: Optional[str] = None
    timestamp: datetime
    insight_type: str
    content: str
    confidence: Optional[float] = None
    source: Optional[str] = None


class InsightsHistoryResponse(BaseModel):
    insights: List[InsightsHistoryItem]
    total: int


class SummaryResponse(BaseModel):
    summary: str
    timestamp: datetime