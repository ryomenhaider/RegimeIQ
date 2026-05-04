from enum import Enum


class Tier(Enum):
    HIGH = "high"
    MID = "mid"
    LOW = "low"

    @staticmethod
    def from_string(s: str) -> "Tier":
        return Tier(s.lower())

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

