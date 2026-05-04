from dataclasses import dataclass
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator

@dataclass
class OrderBookSnapshot:
    symbol: str
    timestamp: int
    bids: list[tuple[float, float]]
    asks: list[tuple[float, float]]
    bid_ask_imbalance: float
    mid_price: float

@dataclass
class TradeEvent:
    symbol: str
    timestamp: int
    price: float
    qty: float
    buyer_maker: bool

@dataclass
class FuturesSnapshot:
    symbol: str
    funding_rate: Optional[float]
    open_interest: Optional[float]
    liquidations: Optional[list[dict]]
    timestamp: int

@dataclass
class AltDataPoint:
    source: str
    value: float
    z_score: float
    raw_payload: dict
    timestamp: int

@dataclass
class BackoffConfig:
    base_delay: float = 1.0
    max_delay: float = 60.0
    max_retries: int = 5
    jitter: float = 0.1

class OrderBookLevel(BaseModel):
    price: float = Field(gt=0)
    quantity: float = Field(gt=0)

class OrderBookUpdate(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    timestamp: int = Field(gt=0)
    bids: list[OrderBookLevel] = Field(min_length=1)
    asks: list[OrderBookLevel] = Field(min_length=1)

    @field_validator("symbol")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()

class TradeUpdate(BaseModel):
    symbol: str = Field(min_length=1)
    trade_id: int = Field(gt=0)
    price: float = Field(gt=0)
    quantity: float = Field(gt=0)
    is_buyer_maker: bool
    timestamp: int = Field(gt=0)

    @field_validator("symbol")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()

class FundingRateUpdate(BaseModel):
    symbol: str = Field(min_length=1)
    funding_rate: float
    funding_time: int = Field(gt=0)

    @field_validator("symbol")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()

class OpenInterestUpdate(BaseModel):
    symbol: str = Field(min_length=1)
    open_interest: float = Field(ge=0)
    timestamp: int = Field(gt=0)

    @field_validator("symbol")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()

class LiquidationUpdate(BaseModel):
    symbol: str = Field(min_length=1)
    price: float = Field(gt=0)
    quantity: float = Field(gt=0)
    side: str = Field(pattern="^(Buy|Sell)$")
    timestamp: int = Field(gt=0)

    @field_validator("symbol")
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        return v.upper()

class AltDataUpdate(BaseModel):
    source: str = Field(min_length=1)
    data: dict[str, Any]
    timestamp: int = Field(gt=0)