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

    async def get_performance_log(self, limit: int = 50, offset: int = 0) -> list[dict]:
        """Get walk-forward validated performance history."""
        if not self.db:
            return []
        
        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT date, symbol, regime_called, confidence, outcome, return_pct
                   FROM performance_log
                   ORDER BY date DESC
                   LIMIT $1 OFFSET $2""",
                min(limit, 100), offset
            )
        
        return [
            {
                "date": r["date"].isoformat() if r["date"] else None,
                "symbol": r["symbol"],
                "regime_called": r["regime_called"],
                "confidence": r["confidence"],
                "outcome": r["outcome"],
                "return": r["return_pct"]
            }
            for r in rows
        ]

    async def get_performance_summary(self, username: str) -> dict:
        """Get performance summary for a user."""
        if not self.db:
            return self._empty_summary()
        
        async with self.db.pool.acquire() as conn:
            stats = await conn.fetchrow(
                """SELECT 
                       COUNT(*) as total_signals,
                       COUNT(*) FILTER (WHERE outcome = 'correct') as correct,
                       AVG(return_pct) as avg_return,
                       SUM(return_pct) as total_return,
                       MAX(return_pct) as max_win,
                       MIN(return_pct) as max_loss
                   FROM performance_log pl
                   JOIN user_symbols us ON us.symbol = pl.symbol
                   JOIN users u ON u.username = $1 AND u.id = us.user_id""",
                username
            )
        
        if not stats or stats["total_signals"] == 0:
            return self._empty_summary()
        
        return {
            "total_signals": stats["total_signals"] or 0,
            "correct_signals": stats["correct"] or 0,
            "accuracy": round((stats["correct"] or 0) / max(stats["total_signals"], 1) * 100, 2),
            "avg_return_pct": round(stats["avg_return"] or 0, 4),
            "total_return_pct": round(stats["total_return"] or 0, 4),
            "max_win_pct": round(stats["max_win"] or 0, 4),
            "max_loss_pct": round(stats["max_loss"] or 0, 4)
        }

    async def get_backtest_history(self, symbol: str | None = None, limit: int = 20) -> list[dict]:
        """Get backtest results history."""
        if not self.db:
            return []
        
        if symbol:
            async with self.db.pool.acquire() as conn:
                rows = await conn.fetch(
                    """SELECT id, symbol, start_date, end_date, strategy, total_return_pct,
                              sharpe_ratio, max_drawdown_pct, win_rate, total_trades, created_at
                       FROM backtest_results
                       WHERE symbol = $1
                       ORDER BY created_at DESC
                       LIMIT $2""",
                    symbol.upper(), min(limit, 50)
                )
        else:
            async with self.db.pool.acquire() as conn:
                rows = await conn.fetch(
                    """SELECT id, symbol, start_date, end_date, strategy, total_return_pct,
                              sharpe_ratio, max_drawdown_pct, win_rate, total_trades, created_at
                       FROM backtest_results
                       ORDER BY created_at DESC
                       LIMIT $1""",
                    min(limit, 50)
                )
        
        return [
            {
                "id": r["id"],
                "symbol": r["symbol"],
                "start_date": r["start_date"].isoformat() if r["start_date"] else None,
                "end_date": r["end_date"].isoformat() if r["end_date"] else None,
                "strategy": r["strategy"],
                "total_return_pct": r["total_return_pct"],
                "sharpe_ratio": r["sharpe_ratio"],
                "max_drawdown_pct": r["max_drawdown_pct"],
                "win_rate": r["win_rate"],
                "total_trades": r["total_trades"]
            }
            for r in rows
        ]

    def _empty_summary(self) -> dict:
        return {
            "total_signals": 0,
            "correct_signals": 0,
            "accuracy": 0,
            "avg_return_pct": 0,
            "total_return_pct": 0,
            "max_win_pct": 0,
            "max_loss_pct": 0
        }