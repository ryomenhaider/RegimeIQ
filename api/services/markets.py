"""Market service - market data and symbol validation."""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class MarketService:
    """Market service for trading data."""

    def __init__(self, exchange=None):
        self.exchange = exchange

    async def validate_symbol(self, symbol: str) -> bool:
        """Validate symbol exists on exchange."""
        if not self.exchange:
            return True
        
        try:
            tickers = await self.exchange.fetch_tickers()
            return symbol.upper() in tickers
        except Exception as e:
            logger.warning(f"Failed to validate symbol {symbol}: {e}")
            return True

    async def get_available_symbols(self) -> list[str]:
        """Get available symbols from exchange."""
        if not self.exchange:
            return ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
        
        try:
            tickers = await self.exchange.fetch_tickers()
            return list(tickers.keys())
        except Exception as e:
            logger.warning(f"Failed to fetch symbols: {e}")
            return ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

    async def get_price(self, symbol: str) -> Optional[dict]:
        """Get current price for symbol."""
        if not self.exchange:
            return None
        
        try:
            ticker = await self.exchange.fetch_ticker(symbol)
            return {
                "symbol": symbol,
                "last": ticker.get("last"),
                "bid": ticker.get("bid"),
                "ask": ticker.get("ask"),
                "volume": ticker.get("baseVolume"),
            }
        except Exception as e:
            logger.warning(f"Failed to fetch price for {symbol}: {e}")
            return None