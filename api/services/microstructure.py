"""Microstructure service - market microstructure logic."""

import json
from datetime import datetime
from typing import Any, Optional


class MicrostructureService:
    """Market microstructure service."""

    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis

    async def get_current(self, symbol: str) -> Optional[dict]:
        """Get current microstructure from Redis."""
        if self.redis:
            data = self.redis.get(f"microstructure:{symbol}")
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
        metrics: Optional[str] = None,
        limit: int = 100
    ) -> list[dict]:
        """Get microstructure history from TimescaleDB."""
        if not self.db:
            return []
        
        limit = min(limit, 5000)
        
        default_cols = [
            "symbol", "timestamp", "ofi", "ofi_ma_10", "vpin",
            "kyle_lambda", "cvd", "trade_intensity", "spread",
            "mid_price", "weighted_mid_price", "depth_imbalance",
            "adverse_selection_pct", "vwap_deviation", "bid_pressure", "ask_pressure"
        ]
        
        if metrics:
            cols = ["symbol", "timestamp"] + [m for m in metrics.split(",") if m in default_cols]
        else:
            cols = default_cols
        
        col_str = ", ".join(cols)
        
        query = f"SELECT {col_str} FROM microstructure_raw WHERE symbol = $1"
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