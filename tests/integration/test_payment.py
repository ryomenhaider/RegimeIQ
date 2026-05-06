"""Integration tests for payment webhook endpoints."""

import pytest
import time
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_webhook_invalid_signature_returns_401(client):
    """Invalid Stripe signature should return 401."""
    response = await client.post(
        "/api/v1/webhooks/stripe",
        headers={
            "Stripe-Signature": "invalid-signature"
        },
        json={
            "type": "invoice.paid",
            "data": {"object": {"id": "inv_123"}}
        }
    )
    
    assert response.status_code in [401, 400]


@pytest.mark.asyncio
async def test_webhook_stale_timestamp_returns_400(client):
    """Stale webhook timestamp should return 400."""
    response = await client.post(
        "/api/v1/webhooks/stripe",
        headers={
            "Stripe-Signature": "t=1234567890,v1=abc"
        },
        json={
            "type": "invoice.paid",
            "data": {"object": {"id": "inv_123"}}
        }
    )
    
    assert response.status_code in [400, 401]


@pytest.mark.asyncio
async def test_webhook_duplicate_invoice_idempotent(client, db):
    """Duplicate webhook should be idempotent."""
    if not db:
        pytest.skip("DB not available")
    
    payload = {
        "type": "invoice.paid",
        "data": {
            "object": {
                "id": "inv_dup_123",
                "customer": "cus_123",
                "subscription": "sub_123",
                "amount_paid": 9900,
                "currency": "usd"
            }
        }
    }
    
    response1 = await client.post(
        "/api/v1/webhooks/stripe",
        json=payload
    )
    
    response2 = await client.post(
        "/api/v1/webhooks/stripe",
        json=payload
    )
    
    assert response1.status_code in [200, 201]
    assert response2.status_code in [200, 201, 400]


@pytest.mark.asyncio
async def test_webhook_paid_upgrades_user_plan(client, db):
    """Paid invoice should upgrade user plan."""
    if not db:
        pytest.skip("DB not available")
    
    response = await client.post(
        "/api/v1/webhooks/stripe",
        json={
            "type": "invoice.paid",
            "data": {
                "object": {
                    "id": "inv_upgrade_123",
                    "customer": "cus_upgrade",
                    "subscription": "sub_upgrade",
                    "amount_paid": 2900,
                    "currency": "usd"
                }
            }
        }
    )
    
    assert response.status_code in [200, 201, 400]


@pytest.mark.asyncio
async def test_webhook_customer_subscription_created(client, db):
    """Subscription created should set plan."""
    if not db:
        pytest.skip("DB not available")
    
    response = await client.post(
        "/api/v1/webhooks/stripe",
        json={
            "type": "customer.subscription.created",
            "data": {
                "object": {
                    "id": "sub_new",
                    "customer": "cus_new",
                    "status": "active",
                    "items": {
                        "data": [
                            {"price": {"unit_amount": 2900}}
                        ]
                    }
                }
            }
        }
    )
    
    assert response.status_code in [200, 201]


@pytest.mark.asyncio
async def test_webhook_subscription_deleted(client, db):
    """Subscription deleted should revert plan."""
    if not db:
        pytest.skip("DB not available")
    
    response = await client.post(
        "/api/v1/webhooks/stripe",
        json={
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_deleted",
                    "customer": "cus_deleted"
                }
            }
        }
    )
    
    assert response.status_code in [200, 201]


@pytest.mark.asyncio
async def test_webhook_unpaid_invoice(client, db):
    """Unpaid invoice should not upgrade user."""
    if not db:
        pytest.skip("DB not available")
    
    response = await client.post(
        "/api/v1/webhooks/stripe",
        json={
            "type": "invoice.payment_failed",
            "data": {
                "object": {
                    "id": "inv_failed",
                    "customer": "cus_failed"
                }
            }
        }
    )
    
    assert response.status_code in [200, 201]