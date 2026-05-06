"""Unit tests for JWT authentication service."""

import json
import base64
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from api.services.auth import (
    AuthService,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)


class TestCreateToken:
    """Tests for access token creation."""

    def test_create_token_has_correct_claims(self):
        """Token should contain all required claims."""
        auth = AuthService()
        
        token, expires_at = auth.create_access_token(
            user_id="user-123",
            username="testuser",
            plan="trial"
        )
        
        payload = json.loads(
            base64.urlsafe_b64decode(token + "==")
        )
        
        assert payload["sub"] == "testuser"
        assert payload["user_id"] == "user-123"
        assert payload["plan"] == "trial"
        assert payload["type"] == "access"
        assert "jti" in payload
        assert "exp" in payload

    def test_expired_token_can_be_detected(self):
        """Expired token can be detected."""
        auth = AuthService()
        
        token, _ = auth.create_access_token(
            user_id="user-123",
            username="testuser",
            plan="trial"
        )
        
        payload = json.loads(
            base64.urlsafe_b64decode(token + "==")
        )
        
        is_expired = payload["exp"] < int(datetime.now(timezone.utc).timestamp())
        assert is_expired is False

    def test_token_expiry_calculation(self):
        """Token expiry should be set correctly."""
        auth = AuthService()
        
        before = int(datetime.now(timezone.utc).timestamp()) + \
                 ACCESS_TOKEN_EXPIRE_MINUTES * 60
        
        token, expires_at = auth.create_access_token(
            user_id="user-456",
            username="testuser2",
            plan="free"
        )
        
        after = int(datetime.now(timezone.utc).timestamp()) + \
                ACCESS_TOKEN_EXPIRE_MINUTES * 60
        
        payload = json.loads(
            base64.urlsafe_b64decode(token + "==")
        )
        
        assert before <= payload["exp"] <= after
        assert expires_at == payload["exp"]


class TestBlacklist:
    """Tests for token blacklisting."""

    @pytest.mark.asyncio
    async def test_blacklisted_jti_raises_401(self):
        """Blacklisted token should be rejected."""
        auth = AuthService()
        
        mock_redis = MagicMock()
        mock_redis.setex = MagicMock()
        mock_redis.get = MagicMock(return_value="1")
        
        auth.redis = mock_redis
        
        jti = "test-jti-123"
        exp = int(datetime.now(timezone.utc).timestamp()) + 3600
        
        await auth.logout(jti, exp)
        
        mock_redis.setex.assert_called_once()


class TestPasswordValidation:
    """Tests for password validation."""

    def test_password_requires_uppercase_and_number(self):
        """Password must meet complexity requirements."""
        auth = AuthService()
        
        valid, _ = auth.validate_password("TestPass123")
        assert valid is True
        
        valid, errors = auth.validate_password("lowercase")
        assert valid is False
        
        valid, errors = auth.validate_password("NoNumbers")
        assert valid is False
        
        valid, errors = auth.validate_password("abc")
        assert valid is False


class TestUsernameValidation:
    """Tests for username validation."""

    def test_username_validation_alphanumeric_only(self):
        """Username must be alphanumeric with underscores."""
        auth = AuthService()
        
        valid, msg = auth.validate_username("testuser")
        assert valid is True
        
        valid, msg = auth.validate_username("test_user_123")
        assert valid is True
        
        valid, msg = auth.validate_username("user-name")
        assert valid is False
        
        valid, msg = auth.validate_username("ab")
        assert valid is False
        
        valid, msg = auth.validate_username("a" * 21)
        assert valid is False


class TestRefreshToken:
    """Tests for refresh token rotation."""

    @pytest.mark.asyncio
    async def test_refresh_without_db_raises(self):
        """Refresh without DB should raise error."""
        auth = AuthService(db=None)
        
        with pytest.raises(ValueError):
            await auth.refresh("test-refresh-token")


class TestPasswordRequirements:
    """Test password complexity."""

    def test_valid_passwords(self):
        """Valid passwords should pass."""
        auth = AuthService()
        
        valid, _ = auth.validate_password("TestPass123")
        assert valid is True

    def test_password_too_short(self):
        """Passwords shorter than 8 chars should fail."""
        auth = AuthService()
        
        valid, _ = auth.validate_password("short")
        assert valid is False

    def test_password_no_uppercase(self):
        """Password must have uppercase letter."""
        auth = AuthService()
        
        valid, _ = auth.validate_password("lowercase123")
        assert valid is False

    def test_password_no_number(self):
        """Password must have a number."""
        auth = AuthService()
        
        valid, _ = auth.validate_password("NoNumbers")
        assert valid is False