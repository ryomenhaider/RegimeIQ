"""AltData service - alternative data logic."""

import json
from datetime import datetime, timezone
from typing import Any, Optional
import numpy as np


VALID_SOURCES = {"reddit", "fred", "trends", "onchain", "futures"}


class AltDataService:
    """Alternative data service."""

    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis

    async def get_confluence(self) -> Optional[dict]:
        """Get confluence from Redis."""
        if self.redis:
            data = await self.redis.get("altdata:confluence")
            if data:
                try:
                    return json.loads(data) if isinstance(data, str) else data
                except Exception:
                    pass
        return None

    async def get_source_latest(self, source: str) -> Optional[dict]:
        """Get latest signal for source."""
        if source not in VALID_SOURCES:
            return None
        
        if self.redis:
            data = await self.redis.get("altdata:signals")
            if data:
                try:
                    signals = json.loads(data) if isinstance(data, str) else data
                    for sig in signals:
                        if sig.get("source") == source:
                            return sig
                except Exception:
                    pass
        return None

    async def get_history(
        self,
        source: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 100
    ) -> list[dict]:
        """Get signal history from TimescaleDB."""
        if not self.db:
            return []
        
        limit = min(limit, 1000)
        
        query = "SELECT * FROM alt_data_signals WHERE 1=1"
        params = []
        
        if source:
            query += " AND source = $1"
            params.append(source)
        
        if start:
            query += f" AND timestamp >= ${len(params) + 1}"
            params.append(start)
        
        if end:
            query += f" AND timestamp <= ${len(params) + 1}"
            params.append(end)
        
        query += f" ORDER BY timestamp DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        
        return [dict(row) for row in rows]

    async def get_correlation(self) -> Optional[dict]:
        """Get correlation matrix."""
        cache_key = "altdata:correlation"
        
        if self.redis:
            cached = await self.redis.get(cache_key)
            if cached:
                try:
                    return json.loads(cached) if isinstance(cached, str) else cached
                except Exception:
                    pass
        
        if not self.db:
            return None
        
        sources = list(VALID_SOURCES)
        data_arrays = {}
        
        for source in sources:
            rows = await self.get_history(source, limit=200)
            if rows:
                data_arrays[source] = [r.get("score", 0) for r in rows]
        
        if not data_arrays:
            return None
        
        min_len = min(len(v) for v in data_arrays.values())
        if min_len == 0:
            return None
        
        matrix = []
        for src1 in sources:
            row = []
            for src2 in sources:
                if src1 not in data_arrays or src2 not in data_arrays:
                    row.append(0.0)
                elif src1 == src2:
                    row.append(1.0)
                else:
                    try:
                        arr1 = np.array(data_arrays[src1][:min_len])
                        arr2 = np.array(data_arrays[src2][:min_len])
                        corr = np.corrcoef(arr1, arr2)[0, 1]
                        row.append(float(corr) if not np.isnan(corr) else 0.0)
                    except Exception:
                        row.append(0.0)
            matrix.append(row)
        
        result = {
            "sources": sources,
            "matrix": matrix,
            "computed_at": datetime.now(timezone.utc).isoformat()
        }
        
        if self.redis:
            await self.redis.setex(cache_key, 3600, json.dumps(result))
        
        return result

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