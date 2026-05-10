"""Symbols service - symbol management logic."""

import logging
import os
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any

import aiohttp

logger = logging.getLogger(__name__)


PLAN_SYMBOL_LIMITS = {
    "trial": 3,
    "standard": 10,
    "unlimited": float("inf"),
    "admin": float("inf"),
    "free": 2,
}

FALLBACK_SYMBOLS = os.getenv("FALLBACK_SYMBOLS", "BTCUSDT,ETHUSDT,BNBUSDT").split(",")


class SymbolsService:
    """Symbols management service."""

    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis

    async def get_user_symbols(self, username: str) -> List[dict]:
        """Get user's watched symbols with regime info."""
        if self.db:
            async with self.db.pool.acquire() as conn:
                rows = await conn.fetch(
                    """SELECT symbol, added_at, model_tier FROM user_symbols
                       WHERE username = $1 ORDER BY added_at DESC""",
                    username
                )
                
                symbols = []
                for row in rows:
                    symbol_info = {
                        "symbol": row["symbol"],
                        "added_at": row["added_at"].isoformat(),
                        "model_tier": row["model_tier"],
                        "current_regime": None
                    }
                    
                    if self.redis:
                        regime_data = await self.redis.get(f"regime:{row['symbol']}")
                        if regime_data:
                            import json
                            try:
                                regime_json = json.loads(regime_data)
                                symbol_info["current_regime"] = regime_json.get("regime")
                            except Exception:
                                pass
                    
                    symbols.append(symbol_info)
                
                return symbols
        return []

    async def add_symbol(self, username: str, symbol: str, plan: str) -> dict:
        """Add symbol to user's watch list."""
        if not symbol or len(symbol) > 20 or not re.match(r"^[A-Z]+USDT$", symbol):
            raise ValueError("Invalid symbol format")

        available = await self.get_available_symbols()
        if symbol not in available:
            raise ValueError("Invalid symbol")

        limit = PLAN_SYMBOL_LIMITS.get(plan, 3)
        
        if self.db:
            async with self.db.pool.acquire() as conn:
                count_row = await conn.fetchrow(
                    "SELECT COUNT(*) as cnt FROM user_symbols WHERE username = $1",
                    username
                )
                if count_row["cnt"] >= limit:
                    raise ValueError(f"Symbol limit reached for {plan} plan")

                existing = await conn.fetchrow(
                    "SELECT id FROM user_symbols WHERE username = $1 AND symbol = $2",
                    username, symbol
                )
                if existing:
                    raise ValueError("Symbol already in watchlist")

                viability = await self.check_viability(symbol)
                model_tier = viability.get("model_tier", "mid")

                await conn.execute(
                    """INSERT INTO user_symbols (username, symbol, model_tier)
                       VALUES ($1, $2, $3)
                       ON CONFLICT (username, symbol) DO NOTHING""",
                    username, symbol, model_tier
                )

                await conn.execute(
                    """INSERT INTO symbol_subscriptions (symbol, subscriber_count)
                       VALUES ($1, 1)
                       ON CONFLICT (symbol) DO UPDATE SET subscriber_count = subscriber_count + 1""",
                    symbol
                )

                warning = viability.get("warning_message") if not viability.get("dedicated_eligible") else None

                if self.redis:
                    count_row = await conn.fetchrow(
                        "SELECT subscriber_count FROM symbol_subscriptions WHERE symbol = $1",
                        symbol
                    )
                    if count_row and count_row["subscriber_count"] == 1:
                        import json
                        self.redis.publish(f"start_stream:{symbol}", json.dumps({"action": "start", "symbol": symbol}))

        return {
            "symbol": symbol,
            "added": datetime.now(timezone.utc).isoformat(),
            "model_tier": model_tier,
            "dedicated_model": viability.get("dedicated_eligible", False),
            "warning": warning
        }

    async def remove_symbol(self, username: str, symbol: str) -> dict:
        """Remove symbol from user's watch list."""
        if self.db:
            async with self.db.pool.acquire() as conn:
                result = await conn.execute(
                    "DELETE FROM user_symbols WHERE username = $1 AND symbol = $2",
                    username, symbol
                )
                if result == "DELETE 0":
                    raise ValueError("Symbol not in watchlist")

                await conn.execute(
                    """UPDATE symbol_subscriptions 
                       SET subscriber_count = subscriber_count - 1
                       WHERE symbol = $1""",
                    symbol
                )

                if self.redis:
                    import json
                    count_row = await conn.fetchrow(
                        "SELECT subscriber_count FROM symbol_subscriptions WHERE symbol = $1",
                        symbol
                    )
                    if count_row and count_row["subscriber_count"] <= 0:
                        self.redis.publish(f"stop_stream:{symbol}", json.dumps({"action": "stop", "symbol": symbol}))

        return {"message": "Symbol removed"}

    async def check_viability(self, symbol: str) -> dict:
        """Check symbol viability."""
        result = {
            "symbol": symbol,
            "dedicated_eligible": False,
            "days_of_data": 0,
            "avg_daily_volume": 0,
            "model_tier": "low",
            "warning_message": None
        }

        if self.db:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """SELECT days_of_data, avg_daily_volume, model_tier
                       FROM symbol_stats WHERE symbol = $1""",
                    symbol
                )
                if row:
                    result["days_of_data"] = row["days_of_data"]
                    result["avg_daily_volume"] = row["avg_daily_volume"]
                    result["model_tier"] = row["model_tier"]
                    
                    threshold_volume = 1_000_000
                    if row["days_of_data"] >= 60 and row["avg_daily_volume"] >= threshold_volume:
                        result["dedicated_eligible"] = True
                        result["model_tier"] = "dedicated"
                    elif row["days_of_data"] >= 30:
                        result["model_tier"] = "mid"
                    else:
                        result["warning_message"] = "Limited historical data"
                else:
                    result["warning_message"] = "No historical data"

        return result

    async def get_available_symbols(self) -> List[str]:
        """Get available Binance futures symbols."""
        cache_key = "symbols:available_list"
        
        if self.redis:
            cached = await self.redis.get(cache_key)
            if cached:
                import json
                try:
                    return json.loads(cached)
                except Exception:
                    pass

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://fapi.binance.com/fapi/v1/exchangeInfo",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    data = await resp.json()
                    
                    symbols = []
                    for s in data.get("symbols", []):
                        if s.get("quoteAsset") == "USDT" and s.get("status") == "TRADING":
                            symbols.append(s.get("symbol"))
                    
                    symbols = sorted(symbols)
                    
                    if self.redis:
                        import json
                        await self.redis.setex(cache_key, 86400, json.dumps(symbols))
                    
                    return symbols
        except Exception as e:
            logger.warning(f"Binance API unavailable, using fallback symbols: {e}")
            return FALLBACK_SYMBOLS