"""Backtest service - backtesting logic."""

import json
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from uuid import uuid4


class BacktestService:
    """Backtesting service."""

    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis

    async def create_job(self, username: str, request: dict) -> dict:
        """Create a new backtest job."""
        job_id = str(uuid4())
        
        if self.db:
            async with self.db.pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO backtest_jobs 
                       (job_id, username, status, request, created_at)
                       VALUES ($1, $2, 'queued', $3, NOW())""",
                    job_id, username, json.dumps(request)
                )
        
        return {
            "job_id": job_id,
            "status": "queued",
            "message": "Backtest queued. Poll GET /backtest/{job_id} for results."
        }

    async def get_job(self, job_id: str, username: str) -> Optional[dict]:
        """Get backtest job status."""
        if not self.db:
            return None
        
        async with self.db.pool.acquire() as conn:
            row = await conn.fetchrow(
                """SELECT job_id, status, request, results, error, 
                          created_at, completed_at
                   FROM backtest_jobs 
                   WHERE job_id = $1 AND username = $2""",
                job_id, username
            )
        
        if not row:
            return None
        
        result = {
            "job_id": row["job_id"],
            "status": row["status"],
            "created_at": row["created_at"].isoformat(),
            "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
            "results": json.loads(row["results"]) if row["results"] else None,
            "error": row["error"]
        }
        
        return result

    async def get_history(self, username: str, limit: int = 20) -> list[dict]:
        """Get user's backtest history."""
        if not self.db:
            return []
        
        limit = min(limit, 50)
        
        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT job_id, status, created_at, completed_at
                   FROM backtest_jobs
                   WHERE username = $1
                   ORDER BY created_at DESC
                   LIMIT $2""",
                username, limit
            )
        
        return [
            {
                "job_id": r["job_id"],
                "status": r["status"],
                "created_at": r["created_at"].isoformat(),
                "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None
            }
            for r in rows
        ]

    async def run_backtest(self, job_id: str, request: dict) -> None:
        """Run backtest (async task)."""
        if not self.db:
            return
        
        async with self.db.pool.acquire() as conn:
            await conn.execute(
                "UPDATE backtest_jobs SET status = 'running' WHERE job_id = $1",
                job_id
            )
        
        try:
            result = await self._execute_strategy(request)
            
            async with self.db.pool.acquire() as conn:
                await conn.execute(
                    """UPDATE backtest_jobs 
                       SET status = 'complete', results = $1, completed_at = NOW()
                       WHERE job_id = $2""",
                    json.dumps(result), job_id
                )
        except Exception as e:
            async with self.db.pool.acquire() as conn:
                await conn.execute(
                    """UPDATE backtest_jobs 
                       SET status = 'failed', error = $1, completed_at = NOW()
                       WHERE job_id = $2""",
                    str(e), job_id
                )

    async def _execute_strategy(self, request: dict) -> dict:
        """Execute backtest strategy (stub)."""
        return {
            "sharpe_ratio": 0.0,
            "max_drawdown_pct": 0.0,
            "win_rate": 0.0,
            "regime_adjusted_sharpe": 0.0,
            "total_trades": 0,
            "per_regime_breakdown": {}
        }

    async def validate_request(self, request: dict) -> tuple[bool, str]:
        """Validate backtest request."""
        if not request:
            return False, "Request is required"
        
        symbol = request.get("symbol", "")
        if not symbol:
            return False, "symbol is required"
        
        date_from = request.get("from")
        date_to = request.get("to")
        
        if not date_from or not date_to:
            return False, "from and to dates are required"
        
        try:
            dt_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            dt_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            
            if (dt_to - dt_from).days > 365:
                return False, "Date range cannot exceed 365 days"
            
            if dt_from >= dt_to:
                return False, "from must be before to"
        except Exception as e:
            return False, f"Invalid date format: {e}"
        
        valid_regimes = ["trending", "mean_reverting", "volatile", "illiquid"]
        params = request.get("params", {})
        
        for regime in params.get("entry_regimes", []):
            if regime not in valid_regimes:
                return False, f"Invalid entry regime: {regime}"
        
        for regime in params.get("exit_regimes", []):
            if regime not in valid_regimes:
                return False, f"Invalid exit regime: {regime}"
        
        return True, ""