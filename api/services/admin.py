"""Admin service - admin management logic."""

import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from uuid import uuid4


class AdminService:
    """Admin management service."""

    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis

    async def generate_beta_code(self, admin_username: str, expires_days: int = 30) -> dict:
        """Generate a new beta code."""
        if not self.db:
            return {"code": str(uuid4()), "expires_at": None}
        
        code = str(uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days) if expires_days else None
        
        async with self.db.pool.acquire() as conn:
            admin = await conn.fetchrow("SELECT id FROM users WHERE username = $1", admin_username)
            admin_id = str(admin["id"]) if admin else None
            
            await conn.execute(
                """INSERT INTO beta_codes (code, created_by, expires_at)
                   VALUES ($1, $2, $3)""",
                code, admin_id, expires_at
            )
        
        return {
            "code": code,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "created_by": admin_username
        }

    async def list_beta_codes(self, limit: int = 50, offset: int = 0) -> tuple[list[dict], int]:
        """List all beta codes."""
        if not self.db:
            return [], 0
        
        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT bc.code, bc.expires_at, bc.is_revoked, bc.created_at,
                       u.username as created_by_username
                  FROM beta_codes bc
                  LEFT JOIN users u ON bc.created_by = u.id
                  ORDER BY bc.created_at DESC LIMIT $1 OFFSET $2""",
                limit, offset
            )
            
            total_row = await conn.fetchrow("SELECT COUNT(*) as cnt FROM beta_codes")
            total = total_row["cnt"] if total_row else 0
        
        codes = [
            {
                "code": r["code"],
                "expires_at": r["expires_at"].isoformat() if r["expires_at"] else None,
                "is_revoked": r["is_revoked"],
                "created_at": r["created_at"].isoformat(),
                "created_by": r["created_by_username"]
            }
            for r in rows
        ]
        
        return codes, total

    async def revoke_beta_code(self, code: str, admin_username: str) -> dict:
        """Revoke a beta code."""
        if not self.db:
            return {"code": code, "revoked": False}
        
        async with self.db.pool.acquire() as conn:
            await conn.execute(
                "UPDATE beta_codes SET is_revoked = TRUE WHERE code = $1",
                code
            )
        
        await self.log_audit(admin_username, "revoke_beta_code", code)
        return {"code": code, "revoked": True}

    async def create_user(self, username: str, email: str, password: str, plan: str = "free", admin_username: str = None) -> dict:
        """Create a new user (admin function)."""
        import logging
        logger = logging.getLogger("admin.create_user")
        
        if not self.db:
            return {"username": username, "created": False}

        from passlib.hash import bcrypt
        
        password_bytes = password.encode('utf-8') if isinstance(password, str) else password
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        password_str = password_bytes.decode('utf-8', errors='replace')
        
        password_hash = bcrypt.hash(password_str, rounds=12)

        async with self.db.pool.acquire() as conn:
            logger.info(f"Checking if user exists: username={username}, email={email}")
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE username = $1 OR email = $2",
                username, email
            )
            if existing:
                logger.warning(f"User already exists: {username}")
                raise ValueError("Username or email already exists")

            logger.info(f"Creating user: {username}")
            password_hash = bcrypt.hash(password_str, rounds=12)

            await conn.execute(
                """INSERT INTO users (username, email, password_hash, plan, status)
                   VALUES ($1, $2, $3, $4, 'active')""",
                username, email, password_hash, plan
            )

        if admin_username:
            await self.log_audit(admin_username, "create_user", username)

        return {"username": username, "email": email, "plan": plan, "created": True}

    async def delete_user(self, username: str, admin_username: str) -> dict:
        """Delete a user."""
        if not self.db:
            return {"username": username, "deleted": False}

        async with self.db.pool.acquire() as conn:
            await conn.execute("DELETE FROM users WHERE username = $1", username)

        await self.log_audit(admin_username, "delete_user", username)
        return {"username": username, "deleted": True}

    async def ban_user(self, username: str, admin_username: str) -> dict:
        """Ban a user."""
        if not self.db:
            return {"username": username, "banned": False}
        
        async with self.db.pool.acquire() as conn:
            await conn.execute(
                """UPDATE users SET is_banned = TRUE, banned_at = NOW(), banned_by = $1
                   WHERE username = $2""",
                admin_username, username
            )
        
        await self.log_audit(admin_username, "ban_user", username)
        return {"username": username, "banned": True}

    async def unban_user(self, username: str, admin_username: str) -> dict:
        """Unban a user."""
        if not self.db:
            return {"username": username, "banned": True}
        
        async with self.db.pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET is_banned = FALSE, banned_at = NULL, banned_by = NULL WHERE username = $1",
                username
            )
        
        await self.log_audit(admin_username, "unban_user", username)
        return {"username": username, "banned": False}

    async def get_config(self) -> list[dict]:
        """Get system config."""
        if not self.db:
            return []
        
        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch("SELECT key, value, updated_at FROM system_config ORDER BY key")
        
        return [
            {
                "key": r["key"],
                "value": r["value"],
                "updated_at": r["updated_at"].isoformat()
            }
            for r in rows
        ]

    async def update_config(self, username: str, key: str, value: str) -> None:
        """Update system config."""
        if not self.db:
            return
        
        async with self.db.pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO system_config (key, value, updated_at)
                   VALUES ($1, $2, NOW())
                   ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()""",
                key, value
            )

    async def reload_config(self) -> int:
        """Reload config into memory."""
        config = await self.get_config()
        return len(config)

    async def list_users(self, limit: int = 50, offset: int = 0) -> tuple[list[dict], int]:
        """List all users."""
        if not self.db:
            return [], 0
        
        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT username, email, plan, status, created_at, trial_ends_at
                   FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2""",
                limit, offset
            )
            
            total_row = await conn.fetchrow("SELECT COUNT(*) as cnt FROM users")
            total = total_row["cnt"] if total_row else 0
        
        users = [
            {
                "username": r["username"],
                "email": r["email"],
                "plan": r["plan"],
                "status": r["status"],
                "created_at": r["created_at"].isoformat(),
                "trial_ends_at": r["trial_ends_at"].isoformat() if r["trial_ends_at"] else None
            }
            for r in rows
        ]
        
        return users, total

    async def get_user_detail(self, username: str) -> Optional[dict]:
        """Get full user detail."""
        if not self.db:
            return None
        
        async with self.db.pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE username = $1",
                username
            )
            
            if not user:
                return None
            
            settings = await conn.fetchrow(
                "SELECT * FROM user_settings WHERE username = $1",
                username
            )
            
            payments = await conn.fetch(
                "SELECT invoice_id, plan, status, paid_at, created_at FROM payments WHERE username = $1 ORDER BY created_at DESC LIMIT 10",
                username
            )
            
            symbols = await conn.fetch(
                "SELECT symbol, model_tier, added_at FROM user_symbols WHERE username = $1",
                username
            )
        
        return {
            "profile": dict(user),
            "settings": dict(settings) if settings else None,
            "payments": [dict(p) for p in payments],
            "symbols": [dict(s) for s in symbols]
        }

    async def update_user(self, username: str, plan: Optional[str], status: Optional[str]) -> dict:
        """Update user."""
        if not self.db:
            return {"username": username}
        
        async with self.db.pool.acquire() as conn:
            if plan:
                await conn.execute("UPDATE users SET plan = $1 WHERE username = $2", plan, username)
            if status:
                await conn.execute("UPDATE users SET status = $1 WHERE username = $2", status, username)
            
            user = await conn.fetchrow(
                "SELECT username, email, plan, status FROM users WHERE username = $1",
                username
            )
        
        return dict(user) if user else {"username": username}

    async def get_models(self) -> list[dict]:
        """Get all HMM models."""
        return []

    async def queue_retrain(self, symbol: str) -> None:
        """Queue retrain."""
        if self.redis:
            self.redis.publish(f"retrain:{symbol}", json.dumps({"symbol": symbol}))

    async def get_system_metrics(self) -> dict:
        """Get system metrics."""
        result = {
            "redis_stream_lag": {},
            "db_pool": {"active": 0, "idle": 0, "max": 0},
            "redis_memory_mb": 0.0,
            "websocket_connections": 0,
            "binance_streams_active": 0,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        if self.redis:
            try:
                info = self.redis.info("memory")
                result["redis_memory_mb"] = round(info.get("used_memory", 0) / 1024 / 1024, 2)
            except Exception:
                pass

        if self.db:
            try:
                pool = self.db.pool
                result["db_pool"] = {
                    "active": pool.size(),
                    "idle": pool.idle_size(),
                    "max": pool.max_size
                }
            except Exception:
                pass

        return result

    async def get_audit_log(self, limit: int = 50) -> list[dict]:
        """Get audit log."""
        if not self.db:
            return []
        
        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT $1",
                limit
            )
        
        return [dict(r) for r in rows]

    async def log_audit(self, admin_user: str, action: str, target: str) -> None:
        """Log audit entry."""
        if not self.db:
            return
        
        async with self.db.pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO audit_log (admin_user, action, target, timestamp)
                   VALUES ($1, $2, $3, NOW())""",
                admin_user, action, target
            )