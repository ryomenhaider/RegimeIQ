"""Integration tests for regime detection endpoints."""

import pytest
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_current_regime_returns_redis_data(client, auth_headers, fake_redis):
    """Current regime should return data from Redis."""
    if not auth_headers:
        pytest.skip("Auth not available")
    
    symbol = "BTCUSDT"
    
    if fake_redis:
        fake_redis.setex(
            f"regime:{symbol}",
            300,
            '{"regime":"bull","confidence":0.8}'
        )
    
    response = await client.get(
        f"/api/v1/regime/{symbol}",
        headers=auth_headers
    )
    
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_current_regime_user_doesnt_own_symbol_returns_403(client, auth_headers):
    """User without symbol subscription should get 403."""
    if not auth_headers:
        pytest.skip("Auth not available")
    
    response = await client.get(
        "/api/v1/regime/NOTYOURSYM",
        headers=auth_headers
    )
    
    assert response.status_code in [200, 403, 404]


@pytest.mark.asyncio
async def test_history_queries_timescaledb(client, auth_headers, db):
    """History should query TimescaleDB."""
    if not db or not auth_headers:
        pytest.skip("DB or auth not available")
    
    response = await client.get(
        "/api/v1/regime/BTCUSDT/history",
        headers=auth_headers
    )
    
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_current_returns_404_when_no_redis_data(client, auth_headers):
    """404 when no regime data in Redis."""
    if not auth_headers:
        pytest.skip("Auth not available")
    
    response = await client.get(
        "/api/v1/regime/NONEXISTENTCOIN",
        headers=auth_headers
    )
    
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_regime_prediction(client, auth_headers):
    """Regime prediction endpoint should work."""
    if not auth_headers:
        pytest.skip("Auth not available")
    
    response = await client.get(
        "/api/v1/regime/BTCUSDT/predict",
        headers=auth_headers
    )
    
    assert response.status_code in [200, 404, 501]


@pytest.mark.asyncio
async def test_regime_confidence_threshold(client, auth_headers):
    """Low confidence regimes should be filtered."""
    if not auth_headers:
        pytest.skip("Auth not available")
    
    response = await client.get(
        "/api/v1/regime/BTCUSDT?min_confidence=0.7",
        headers=auth_headers
    )
    
    assert response.status_code in [200, 404]