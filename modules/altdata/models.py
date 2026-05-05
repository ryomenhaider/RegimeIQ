"""Altdata data models for signal processing and confluence."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SentimentPoint:
    """A sentiment data point with score and timestamp."""
    score: float
    timestamp: int


@dataclass
class AltDataSignal:
    """Signal from alternative data source."""
    source: str
    symbol: str
    timestamp: int
    signal_type: str
    value: float
    z_score: float
    velocity_z: float
    direction: int
    lead_lag: str
    metadata: Optional[dict] = None


@dataclass
class ConfluenceResult:
    """Result from confluence engine."""
    symbol: str
    timestamp: int
    confluence_score: float
    direction: int
    alert: bool
    sources_agreeing: list[str]
    source_signals: dict[str, AltDataSignal]


@dataclass
class MacroOverlay:
    """Macro regime overlay signal."""
    risk_on: bool
    yield_curve_inverted: bool
    unemployment_rising: bool
    composite_score: float
    timestamp: int


@dataclass
class AltDataSignalMetrics:
    """Metrics from spike detection."""
    z_score: float
    is_spike: bool
    direction: int  # +1 bullish (up), -1 bearish (down)