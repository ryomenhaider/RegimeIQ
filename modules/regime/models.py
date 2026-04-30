from dataclasses import dataclass
from typing import Optional


@dataclass
class RegimeOutput:
    regime: str
    confidence: float
    transition_probs: list[float]
    vpin: Optional[float] = None
    kyle_lambda: Optional[float] = None
    spread: Optional[float] = None
    depth_imbalance: Optional[float] = None