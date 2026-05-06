"""Unit tests for rate limiting middleware."""

import pytest

from api.middleware.rate_limit import (
    RateLimitMiddleware,
    parse_jwt_sub,
    RATE_LIMITS,
)


class TestRateLimitConfiguration:
    """Tests for rate limit configuration."""

    def test_default_limits_defined(self):
        """Default rate limits should be defined."""
        assert "POST:/auth/login" in RATE_LIMITS
        assert "POST:/auth/register" in RATE_LIMITS
        assert RATE_LIMITS["POST:/auth/login"]["limit"] == 10
        assert RATE_LIMITS["POST:/auth/register"]["limit"] == 5


class TestParseJWT:
    """Tests for JWT parsing."""

    def test_parse_three_part_jwt(self):
        """Should parse 3-part JWT."""
        import base64
        import json
        
        header = base64.urlsafe_b64encode(b'{"alg":"HS256"}').decode().rstrip("=")
        payload = base64.urlsafe_b64encode(
            json.dumps({"sub": "testuser", "user_id": "123"}).encode()
        ).decode().rstrip("=")
        signature = base64.urlsafe_b64encode(b"signature").decode().rstrip("=")
        
        token = f"{header}.{payload}.{signature}"
        
        result = parse_jwt_sub(token)
        
        assert result == "testuser"

    def test_parse_invalid_jwt(self):
        """Should return None for invalid JWT."""
        result = parse_jwt_sub("invalid-token")
        
        assert result is None