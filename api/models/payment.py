"""Payment models - Pydantic models for payments."""

from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


class CreatePaymentRequest(BaseModel):
    plan: Literal["standard", "unlimited"]


class PaymentResponse(BaseModel):
    invoice_id: str
    invoice_url: str
    amount_usd: float
    expires_at: str


class PaymentStatusResponse(BaseModel):
    invoice_id: str
    status: str
    paid_at: Optional[str] = None


class PaymentRecord(BaseModel):
    invoice_id: str
    plan: str
    amount: float
    currency: str
    status: str
    paid_at: Optional[str] = None
    created_at: str


class WebhookPayload(BaseModel):
    invoice_id: str
    status: str
    timestamp: int
    amount: Optional[float] = None
    currency: Optional[str] = None


class OldCreatePaymentRequest(BaseModel):
    tier: str = Field(..., pattern=r"^(basic|pro)$")
    email: str


class OldPaymentResponse(BaseModel):
    payment_id: str
    invoice_url: str
    amount: float
    currency: str = "USD"
    status: str
    expires_at: datetime


class OldPaymentStatusResponse(BaseModel):
    payment_id: str
    status: str
    tier: Optional[str] = None
    paid_at: Optional[datetime] = None


class OldPaymentWebhookRequest(BaseModel):
    event: str
    payment_id: str
    timestamp: int
    data: dict


PaymentWebhookRequest = WebhookPayload