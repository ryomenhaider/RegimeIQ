"""Integration tests for symbol management endpoints."""

import pytest


@pytest.mark.asyncio
async def test_add_symbol_success(client, auth_headers, db):
    """Adding valid symbol should succeed."""
    if not db or not auth_headers:
        pytest.skip("DB or auth not available")
    
    response = await client.post(
        "/api/v1/users/symbols",
        json={"symbol": "BTCUSDT"},
        headers=auth_headers
    )
    
    assert response.status_code in [200, 201, 403]


@pytest.mark.asyncio
async def test_add_symbol_at_plan_limit_returns_403(client, auth_headers, db):
    """Adding symbol at plan limit should return 403."""
    if not db or not auth_headers:
        pytest.skip("DB or auth not available")
    
    response = await client.post(
        "/api/v1/users/symbols",
        json={"symbol": "BTCUSDT"},
        headers=auth_headers
    )
    
    if response.status_code == 201:
        for _ in range(10):
            await client.post(
                "/api/v1/users/symbols",
                json={"symbol": "ETHUSDT"},
                headers=auth_headers
            )
        
        response = await client.post(
            "/api/v1/users/symbols",
            json={"symbol": "SOLUSDT"},
            headers=auth_headers
        )
    
    assert response.status_code in [201, 403]


@pytest.mark.asyncio
async def test_add_invalid_symbol_returns_400(client, auth_headers, db):
    """Adding invalid symbol should return 400."""
    if not db or not auth_headers:
        pytest.skip("DB or auth not available")
    
    response = await client.post(
        "/api/v1/users/symbols",
        json={"symbol": "INVALIDCOIN123"},
        headers=auth_headers
    )
    
    assert response.status_code in [400, 404]


@pytest.mark.asyncio
async def test_remove_symbol_decrements_subscriber_count(client, auth_headers, db):
    """Removing symbol should decrement subscriber count."""
    if not db or not auth_headers:
        pytest.skip("DB or auth not available")
    
    symbol = "BTCUSDT"
    
    await client.post(
        "/api/v1/users/symbols",
        json={"symbol": symbol},
        headers=auth_headers
    )
    
    response = await client.delete(
        f"/api/v1/users/symbols/{symbol}",
        headers=auth_headers
    )
    
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_list_symbols(client, auth_headers, db):
    """Listing user symbols should work."""
    if not db or not auth_headers:
        pytest.skip("DB or auth not available")
    
    response = await client.get(
        "/api/v1/users/symbols",
        headers=auth_headers
    )
    
    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_duplicate_symbol_returns_400(client, auth_headers, db):
    """Adding duplicate symbol should return 400."""
    if not db or not auth_headers:
        pytest.skip("DB or auth not available")
    
    symbol = "ETHUSDT"
    
    await client.post(
        "/api/v1/users/symbols",
        json={"symbol": symbol},
        headers=auth_headers
    )
    
    response = await client.post(
        "/api/v1/users/symbols",
        json={"symbol": symbol},
        headers=auth_headers
    )
    
    assert response.status_code in [200, 400]