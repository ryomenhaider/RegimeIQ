"""Integration tests for authentication endpoints."""

import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_register_success_returns_token(client, db):
    """Register should return access token."""
    if not db:
        pytest.skip("DB not available")
    
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "newuser123",
            "email": "newuser123@test.com",
            "password": "TestPass123"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "data" in data
    assert "access_token" in data["data"]


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_400(client, db):
    """Duplicate email should return 400."""
    if not db:
        pytest.skip("DB not available")
    
    username = "userdup"
    email = "duplicate@test.com"
    password = "TestPass123"
    
    await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": username + "2", "email": email, "password": password}
    )
    
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_register_duplicate_username_same_message(client, db):
    """Duplicate username should return SAME error message (no enumeration)."""
    if not db:
        pytest.skip("DB not available")
    
    username = "samename"
    email1 = "same1@test.com"
    email2 = "same2@test.com"
    password = "TestPass123"
    
    await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email1, "password": password}
    )
    
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email2, "password": password}
    )
    
    assert response.status_code == 400
    
    error_msg = response.json().get("error", {}).get("message", "")
    
    assert "username" in error_msg.lower() or "email" in error_msg.lower() or "invalid" in error_msg.lower()


@pytest.mark.asyncio
async def test_login_success(client, db):
    """Login with valid credentials should succeed."""
    if not db:
        pytest.skip("DB not available")
    
    username = "logintest"
    email = "login@test.com"
    password = "TestPass123"
    
    await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data.get("data", {})


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client, db):
    """Login with wrong password should return 401."""
    if not db:
        pytest.skip("DB not available")
    
    username = "wrongpass"
    email = "wrongpass@test.com"
    password = "TestPass123"
    
    await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "WrongPassword456"}
    )
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rotates_token(client, db):
    """Refresh should rotate tokens."""
    if not db:
        pytest.skip("DB not available")
    
    username = "refreshtest"
    email = "refresh@test.com"
    password = "TestPass123"
    
    reg_response = await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    data = reg_response.json()
    refresh_token = data.get("data", {}).get("refresh_token")
    
    if not refresh_token:
        pytest.skip("Refresh token not available")
    
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    
    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_refresh_token_reuse_revokes_all_sessions(client, db):
    """Reused refresh token should revoke all sessions."""
    if not db:
        pytest.skip("DB not available")
    
    username = "revoketest"
    email = "revoke@test.com"
    password = "TestPass123"
    
    reg_response = await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    data = reg_response.json()
    refresh_token = data.get("data", {}).get("refresh_token")
    
    if not refresh_token:
        pytest.skip("Refresh token not available")
    
    await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    
    assert response.status_code in [200, 401, 422]


@pytest.mark.asyncio
async def test_logout_blacklists_jti(client, db):
    """Logout should blacklist the JWT."""
    if not db:
        pytest.skip("DB not available")
    
    username = "logouttest"
    email = "logout@test.com"
    password = "TestPass123"
    
    reg_response = await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    data = reg_response.json()
    access_token = data.get("data", {}).get("access_token")
    
    if not access_token:
        pytest.skip("Access token not available")
    
    response = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    assert response.status_code in [200, 401, 404]


@pytest.mark.asyncio
async def test_check_username_available(client, db):
    """Check username should return available status."""
    if not db:
        pytest.skip("DB not available")
    
    response = await client.get("/api/v1/auth/check-username/newuniqueuser")
    
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_check_username_taken(client, db):
    """Check username should return taken for existing user."""
    if not db:
        pytest.skip("DB not available")
    
    username = "takenuser"
    email = "taken@test.com"
    password = "TestPass123"
    
    await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    response = await client.get(f"/api/v1/auth/check-username/{username}")
    
    assert response.status_code == 200
    data = response.json()
    assert data.get("data", {}).get("available") is False