"""Payment router - payment endpoints."""

import hashlib
import hmac
import os
import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from api.dependencies.auth import get_current_user, CurrentUser
from api.models.common import success_response, error_response, ERROR_NOT_FOUND, ERROR_VALIDATION_ERROR
from api.services.factory import get_services

router = APIRouter(prefix="/payment", tags=["payment"])

OXAPAY_MERCHANT_KEY = os.getenv("OXAPAY_MERCHANT_KEY", "")
OXAPAY_WEBHOOK_SECRET = os.getenv("OXAPAY_WEBHOOK_SECRET", "")


class CreatePaymentRequest(BaseModel):
    plan: str = Field(..., pattern=r"^(standard|unlimited)$")


@router.post("/create")
async def create_payment(
    request: Request,
    user: CurrentUser = Depends(get_current_user)
):
    """Create OxaPay invoice."""
    body = await request.json()
    plan = body.get("plan", "")
    
    if plan not in ("standard", "unlimited"):
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, "Invalid plan")
        )
    
    try:
        result = await get_services().payment.create_invoice(
            user.username, plan, OXAPAY_MERCHANT_KEY
        )
        return JSONResponse(
            status_code=201,
            content=success_response(result)
        )
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content=error_response(ERROR_VALIDATION_ERROR, str(e))
        )


@router.get("/status/{invoice_id}")
async def get_payment_status(
    invoice_id: str,
    user: CurrentUser = Depends(get_current_user)
):
    """Get payment status."""
    result = await get_services().payment.get_status(invoice_id, user.username)
    
    if not result:
        return JSONResponse(
            status_code=404,
            content=error_response(ERROR_NOT_FOUND, "Invoice not found")
        )
    
    return success_response(result)


@router.get("/history")
async def get_history(user: CurrentUser = Depends(get_current_user)):
    """Get payment history."""
    payments = await get_services().payment.get_history(user.username)
    return success_response({"payments": payments})


@router.post("/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def payment_webhook(request: Request):
    """Handle OxaPay webhook."""
    body = await request.body()
    signature = request.headers.get("X-OxaPay-Signature", "")
    
    if not get_services().payment.verify_signature(body, signature, OXAPAY_WEBHOOK_SECRET):
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid signature"}
        )
    
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    
    timestamp = payload.get("timestamp", 0)
    if timestamp and abs(time.time() - timestamp) > 300:
        return JSONResponse(
            status_code=400,
            content={"error": "Stale webhook"}
        )
    
    await get_services().payment.process_webhook(payload)
    
    return Response(status_code=204)


@router.post("/cancel")
async def cancel_subscription(user: CurrentUser = Depends(get_current_user)):
    """Cancel user subscription."""
    await get_services().payment.cancel_subscription(user.username)
    return success_response({"message": "Subscription cancelled."})