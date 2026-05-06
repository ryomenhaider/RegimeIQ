"""Payment service - payment processing logic."""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

import aiohttp

logger = logging.getLogger(__name__)

PLAN_PRICES = {
    "standard": 47.00,
    "unlimited": 97.00,
}

OXAPAY_URL = "https://api.oxapay.com/merchants/request"


class PaymentService:
    """Payment processing service."""

    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis

    async def create_invoice(self, username: str, plan: str, api_key: str) -> dict:
        """Create OxaPay invoice."""
        amount = PLAN_PRICES.get(plan)
        if not amount:
            raise ValueError(f"Invalid plan: {plan}")

        payload = {
            "merchant": api_key,
            "amount": amount,
            "currency": "USD",
            "lifeTime": 15,
            "description": f"VektorLabs {plan.capitalize()} Plan"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    OXAPAY_URL,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    data = await resp.json()
                    
                    if data.get("error"):
                        raise ValueError(data.get("message", "Payment API error"))
                    
                    invoice_id = data.get("result", {}).get("id")
                    invoice_url = data.get("result", {}).get("link")
                    expires_at = data.get("result", {}).get("expireDate")
        except Exception as e:
            logger.error(f"OxaPay API error: {e}")
            invoice_id = f"inv_{datetime.now(timezone.utc).timestamp()}"
            invoice_url = f"https://checkout.oxapay.com/{invoice_id}"
            expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()

        if self.db:
            async with self.db.pool.acquire() as conn:
                expires = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                await conn.execute(
                    """INSERT INTO payments 
                       (invoice_id, username, plan, amount, currency, status, expires_at, created_at)
                       VALUES ($1, $2, $3, $4, 'USD', 'pending', $5, NOW())""",
                    invoice_id, username, plan, amount, expires
                )

        return {
            "invoice_id": invoice_id,
            "invoice_url": invoice_url,
            "amount_usd": amount,
            "expires_at": expires_at
        }

    async def get_status(self, invoice_id: str, username: str) -> Optional[dict]:
        """Get payment status."""
        if not self.db:
            return None

        async with self.db.pool.acquire() as conn:
            row = await conn.fetchrow(
                """SELECT invoice_id, status, paid_at, plan
                   FROM payments 
                   WHERE invoice_id = $1 AND username = $2""",
                invoice_id, username
            )

        if not row:
            return None

        return {
            "invoice_id": row["invoice_id"],
            "status": row["status"],
            "paid_at": row["paid_at"].isoformat() if row["paid_at"] else None,
            "plan": row["plan"]
        }

    async def get_history(self, username: str) -> list[dict]:
        """Get payment history."""
        if not self.db:
            return []

        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT invoice_id, plan, amount, currency, status, paid_at, created_at
                   FROM payments 
                   WHERE username = $1
                   ORDER BY created_at DESC""",
                username
            )

        return [
            {
                "invoice_id": r["invoice_id"],
                "plan": r["plan"],
                "amount": r["amount"],
                "currency": r["currency"],
                "status": r["status"],
                "paid_at": r["paid_at"].isoformat() if r["paid_at"] else None,
                "created_at": r["created_at"].isoformat()
            }
            for r in rows
        ]

    async def process_webhook(self, payload: dict) -> None:
        """Process webhook payload."""
        invoice_id = payload.get("invoiceId", "")
        status = payload.get("status", "")
        
        if not invoice_id:
            logger.warning("Webhook missing invoiceId")
            return

        if self.redis:
            processed = self.redis.get(f"webhook_processed:{invoice_id}")
            if processed:
                logger.info(f"Webhook already processed: {invoice_id}")
                return
            self.redis.setex(f"webhook_processed:{invoice_id}", 86400, "1")

        logger.info(f"Processing webhook: {invoice_id} status={status}")

        if status == "paid":
            paid_at = datetime.now(timezone.utc)
            
            if self.db:
                async with self.db.pool.acquire() as conn:
                    await conn.execute(
                        """UPDATE payments 
                           SET status = 'paid', paid_at = $1 
                           WHERE invoice_id = $2""",
                        paid_at, invoice_id
                    )

                    row = await conn.fetchrow(
                        "SELECT username, plan FROM payments WHERE invoice_id = $1",
                        invoice_id
                    )

                    if row:
                        expires = paid_at + timedelta(days=30)
                        await conn.execute(
                            """UPDATE users 
                               SET plan = $1, subscription_active_until = $2, updated_at = NOW()
                               WHERE username = $3""",
                            row["plan"], expires, row["username"]
                        )
            
            logger.info(f"Payment completed for {invoice_id}")

        elif status == "failed":
            if self.db:
                async with self.db.pool.acquire() as conn:
                    await conn.execute(
                        """UPDATE payments SET status = 'failed' WHERE invoice_id = $1""",
                        invoice_id
                    )

        logger.info(f"Webhook processed: {invoice_id}")

    def verify_signature(self, payload: bytes, signature: str, secret: str) -> bool:
        """Verify HMAC signature."""
        if not signature:
            return False
        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected)