"""Data models for LLM Reasoner."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class CausalInsight:
    """An insight extracted from an LLM response."""
    source: str
    document_type: str
    entity: str
    summary: str
    causal_chain: dict
    affected_assets: list
    source_sentence: str
    timestamp: str


@dataclass
class SummaryOutput:
    """Market summary from LLM."""
    summary: str
    regime: str
    confluence: float
    direction: str
    timestamp: str