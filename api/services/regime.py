"""Regime service - regime detection logic."""

import json
from datetime import datetime, timezone
from typing import Any, Optional


class RegimeService:
    """Regime detection service."""

    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis

    async def get_all_current(self, username: str) -> dict:
        """Get current regime for all user symbols."""
        if self.db and self.redis:
            async with self.db.pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT symbol FROM user_symbols WHERE username = $1",
                    username
                )
            
            result = {}
            for row in rows:
                symbol = row["symbol"]
                data = self.redis.get(f"regime:{symbol}")
                if data:
                    try:
                        result[symbol] = json.loads(data) if isinstance(data, str) else data
                    except Exception:
                        pass
            
            return {"symbols": result}
        return {"symbols": {}}

    async def get_current(self, symbol: str) -> Optional[dict]:
        """Get current regime state from Redis."""
        if self.redis:
            data = self.redis.get(f"regime:{symbol}")
            if data:
                try:
                    return json.loads(data) if isinstance(data, str) else data
                except Exception:
                    pass
        return None

    async def get_history(
        self,
        symbol: str,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 100
    ) -> list[dict]:
        """Get regime history from TimescaleDB."""
        if not self.db:
            return []
        
        limit = min(limit, 1000)
        
        query = "SELECT * FROM regime_states WHERE symbol = $1"
        params = [symbol]
        
        if start:
            query += f" AND timestamp >= ${len(params) + 1}"
            params.append(start)
        
        if end:
            query += f" AND timestamp <= ${len(params) + 1}"
            params.append(end)
        
        query += f" ORDER BY timestamp ASC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        
        return [dict(row) for row in rows]

    async def get_model_info(self, symbol: str) -> Optional[dict]:
        """Get model info."""
        return None

    async def check_ownership(self, username: str, symbol: str) -> bool:
        """Check if user owns symbol."""
        if not self.db:
            return True
        
        async with self.db.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT 1 FROM user_symbols WHERE username = $1 AND symbol = $2",
                username, symbol
            )
        return row is not None