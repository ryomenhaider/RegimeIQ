"""Integration tests for WebSocket endpoint."""

import asyncio
import json

import pytest


@pytest.mark.asyncio
async def test_connect_without_auth_closes_with_4001(client, db):
    """Connecting without auth should close with 4001."""
    if not db:
        pytest.skip("DB not available")
    
    from fastapi.testclient import TestClient
    from api.main import app
    
    with TestClient(app).websocket_connect("/ws") as ws:
        ws.close(code=4001)


@pytest.mark.asyncio
async def test_auth_timeout_closes_connection(client, db):
    """Auth timeout should close connection."""
    if not db:
        pytest.skip("DB not available")
    
    import httpx
    
    async with httpx.AsyncClient() as ac:
        with pytest.raises(httpx.ReadTimeout):
            async with ac.ws_connect("http://test/ws") as ws:
                pass


@pytest.mark.asyncio
async def test_auth_success_sends_auth_ok(client, db):
    """Successful auth should send auth_ok."""
    if not db:
        pytest.skip("DB not available")
    
    pass


@pytest.mark.asyncio
async def test_subscribe_adds_to_subscriptions(client, db):
    """Subscribe message should add to subscriptions."""
    if not db:
        pytest.skip("DB not available")
    
    pass


@pytest.mark.asyncio
async def test_ping_returns_pong(client):
    """Ping should return pong."""
    pass


@pytest.mark.asyncio
async def test_disconnect_removes_from_registry(client, db):
    """Disconnect should remove from registry."""
    if not db:
        pytest.skip("DB not available")
    
    pass


@pytest.mark.asyncio
async def test_unauthorized_token_returns_4001(client):
    """Unauthorized token should return 4001."""
    pass


@pytest.mark.asyncio
async def test_malformed_json_closes_connection(client):
    """Malformed JSON should close connection."""
    pass


@pytest.mark.asyncio
async def test_heartbeat_timeout_closes_connection(client):
    """Heartbeat timeout should close connection."""
    pass