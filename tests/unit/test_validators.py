"""Unit tests for input validators."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from api.services.auth import AuthService


class TestUsernameValidator:
    """Tests for username validation."""

    def test_valid_usernames(self):
        """Valid usernames should pass validation."""
        auth = AuthService()
        
        valid, msg = auth.validate_username("testuser")
        assert valid is True

        valid, msg = auth.validate_username("test_user")
        assert valid is True

        valid, msg = auth.validate_username("user123")
        assert valid is True

    def test_invalid_usernames_too_short(self):
        """Usernames too short should fail."""
        auth = AuthService()
        
        valid, msg = auth.validate_username("ab")
        assert valid is False

    def test_invalid_usernames_too_long(self):
        """Usernames too long should fail."""
        auth = AuthService()
        
        valid, msg = auth.validate_username("a" * 21)
        assert valid is False

    def test_username_no_special_chars(self):
        """Username should not allow special characters."""
        auth = AuthService()
        
        valid, msg = auth.validate_username("user-name")
        assert valid is False
        
        valid, msg = auth.validate_username("user name")
        assert valid is False


class TestPasswordValidator:
    """Tests for password validation."""

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


class TestSymbolValidator:
    """Tests for symbol validation against Binance."""

    @pytest.mark.asyncio
    async def test_valid_binance_symbol(self):
        """Valid Binance symbols should be accepted."""
        from api.services.markets import MarketService
        
        mock_exchange = MagicMock()
        mock_exchange.fetch_tickers = AsyncMock(return_value={
            "BTCUSDT": {"symbol": "BTCUSDT"},
            "ETHUSDT": {"symbol": "ETHUSDT"},
        })
        
        market = MarketService(exchange=mock_exchange)
        
        result = await market.validate_symbol("BTCUSDT")
        
        assert result is True

    @pytest.mark.asyncio
    async def test_invalid_symbol_rejected(self):
        """Invalid symbols should be rejected."""
        from api.services.markets import MarketService
        
        mock_exchange = MagicMock()
        mock_exchange.fetch_tickers = AsyncMock(return_value={
            "BTCUSDT": {"symbol": "BTCUSDT"},
        })
        
        market = MarketService(exchange=mock_exchange)
        
        result = await market.validate_symbol("NOTREAL")
        
        assert result is False

    @pytest.mark.asyncio
    async def test_symbol_list_from_binance(self):
        """Should fetch valid symbols from Binance."""
        from api.services.markets import MarketService
        
        mock_exchange = MagicMock()
        mock_exchange.fetch_tickers = AsyncMock(return_value={
            "BTCUSDT": {},
            "ETHUSDT": {},
            "SOLUSDT": {},
        })
        
        market = MarketService(exchange=mock_exchange)
        
        symbols = await market.get_available_symbols()
        
        assert "BTCUSDT" in symbols
        assert "ETHUSDT" in symbols