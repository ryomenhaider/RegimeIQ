"""Insights service - LLM insights logic."""

import json
from datetime import datetime, timezone, timedelta
from typing import Any, Optional


PLAN_CHAT_LIMITS = {
    "trial": 5,
    "standard": 50,
    "unlimited": float("inf"),
    "free": 5,
}


class InsightsService:
    """LLM insights service."""

    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis

    async def get_latest(self, limit: int = 10, source: Optional[str] = None) -> list[dict]:
        """Get latest insights from Redis stream."""
        if not self.redis:
            return []
        
        limit = min(limit, 50)
        
        try:
            data = self.redis.xrevrange("llm:insights", count=limit)
            if not data:
                return []
            
            insights = []
            for item in data:
                try:
                    parsed = json.loads(item) if isinstance(item, str) else item
                    if source is None or parsed.get("source") == source:
                        insights.append(parsed)
                except Exception:
                    pass
            
            return insights[:limit]
        except Exception:
            return []

    async def get_history(
        self,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        asset: Optional[str] = None,
        limit: int = 100
    ) -> list[dict]:
        """Get insight history from TimescaleDB."""
        if not self.db:
            return []
        
        limit = min(limit, 1000)
        
        query = "SELECT * FROM llm_insights WHERE 1=1"
        params = []
        
        if asset:
            query += " AND $1 = ANY(affected_assets)"
            params.append(asset)
        
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

    async def get_summary(self) -> Optional[dict]:
        """Get market summary from Redis."""
        if self.redis:
            data = self.redis.get("llm:summary")
            if data:
                try:
                    return json.loads(data) if isinstance(data, str) else data
                except Exception:
                    pass
        return None

    async def check_chat_limit(self, username: str, plan: str) -> bool:
        """Check if user has chat quota remaining."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = f"chat_limit:{username}:{today}"
        
        limit = PLAN_CHAT_LIMITS.get(plan, 5)
        
        if self.redis:
            current = self.redis.get(key)
            if current:
                try:
                    count = int(current)
                    return count < limit
                except Exception:
                    pass
        
        return True

    async def increment_chat_limit(self, username: str) -> None:
        """Increment daily chat counter."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = f"chat_limit:{username}:{today}"
        
        if self.redis:
            count = self.redis.incr(key)
            if count == 1:
                self.redis.expire(key, 86400)

    async def build_rag_context(self, symbol: str) -> dict:
        """Build RAG context from Redis."""
        context = {
            "regime": None,
            "microstructure": None,
            "confluence": None,
            "recent_insights": []
        }
        
        if not self.redis:
            return context
        
        try:
            regime = self.redis.get(f"regime:{symbol}")
            if regime:
                context["regime"] = json.loads(regime) if isinstance(regime, str) else regime
        except Exception:
            pass
        
        try:
            micro = self.redis.get(f"microstructure:{symbol}")
            if micro:
                context["microstructure"] = json.loads(micro) if isinstance(micro, str) else micro
        except Exception:
            pass
        
        try:
            confluence = self.redis.get("altdata:confluence")
            if confluence:
                context["confluence"] = json.loads(confluence) if isinstance(confluence, str) else confluence
        except Exception:
            pass
        
        try:
            insights = self.redis.xrevrange("llm:insights", count=3)
            context["recent_insights"] = insights
        except Exception:
            pass
        
        return context