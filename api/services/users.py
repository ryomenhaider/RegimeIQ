"""Users service - user management logic."""

import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from uuid import UUID

import aiohttp
from passlib.hash import bcrypt


class UsersService:
    """Users management service."""

    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis

    async def get_profile(self, username: str) -> dict:
        """Get user profile."""
        if self.db:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """SELECT id, username, plan, trial_ends_at, created_at
                       FROM users WHERE username = $1 AND status = 'active'""",
                    username
                )
                if not row:
                    raise ValueError("User not found")
                return {
                    "username": row["username"],
                    "plan": row["plan"],
                    "trial_ends_at": row["trial_ends_at"].isoformat() if row["trial_ends_at"] else None,
                    "created_at": row["created_at"].isoformat()
                }
        return {
            "username": username,
            "plan": "trial",
            "trial_ends_at": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    async def get_settings(self, username: str) -> dict:
        """Get user settings with defaults."""
        defaults = {
            "username": username,
            "alert_threshold": 0.75,
            "discord_webhook": None,
            "reddit_subs": [],
            "fred_series": ["T10Y2Y", "CPIAUCSL", "FEDFUNDS"],
            "trends_keywords": [],
            "timezone": "UTC",
            "default_tab": "microstructure",
            "layout_config": {},
            "notifications": {
                "email": True,
                "regime_alerts": True,
                "weekly_summary": False
            }
        }

        if self.db:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM user_settings WHERE username = $1",
                    username
                )
                if row:
                    defaults.update(dict(row))
                    if defaults.get("discord_webhook"):
                        defaults["discord_webhook"] = self._mask_webhook(defaults["discord_webhook"])
                else:
                    await conn.execute(
                        """INSERT INTO user_settings (username) VALUES ($1)""",
                        username
                    )

        return defaults

    def _mask_webhook(self, webhook: str) -> str:
        """Mask Discord webhook URL."""
        if not webhook:
            return None
        if "/webhooks/" in webhook:
            parts = webhook.split("/webhooks/")[1].split("/")
            if len(parts) >= 2:
                return f"https://discord.com/api/webhooks/.../{parts[1]}"
        return webhook

    async def update_settings(self, username: str, update: dict) -> dict:
        """Update user settings."""
        if self.db:
            discord_webhook = update.get("discord_webhook")
            if discord_webhook:
                is_valid = await self._test_discord_webhook(discord_webhook)
                if not is_valid:
                    raise ValueError("Discord webhook test failed")

            fields = []
            values = []
            for i, (key, value) in enumerate(update.items()):
                fields.append(f"{key} = ${i + 1}")
                values.append(value)
            
            values.append(username)

            if fields:
                async with self.db.pool.acquire() as conn:
                    await conn.execute(
                        f"""UPDATE user_settings SET {', '.join(fields)}, updated_at = NOW()
                            WHERE username = ${len(values)}""",
                        *values
                    )

        return await self.get_settings(username)

    async def _test_discord_webhook(self, webhook: str) -> bool:
        """Test Discord webhook."""
        if not webhook or "/webhooks/" not in webhook:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                payload = {"content": "🔔 VektorLabs test alert"}
                async with session.post(webhook, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    return resp.status < 400
        except Exception:
            return False

    async def update_account(self, username: str, update: dict) -> dict:
        """Update email or password."""
        current_password = update.get("current_password", "")
        new_email = update.get("new_email")
        new_password = update.get("new_password")

        if not current_password:
            raise ValueError("Current password required")

        if self.db:
            async with self.db.pool.acquire() as conn:
                user = await conn.fetchrow(
                    "SELECT password_hash FROM users WHERE username = $1",
                    username
                )
                if not user or not bcrypt.verify(current_password, user["password_hash"]):
                    raise ValueError("Invalid current password")

                if new_email:
                    existing = await conn.fetchrow(
                        "SELECT id FROM users WHERE email = $1 AND username != $2",
                        new_email, username
                    )
                    if existing:
                        raise ValueError("Email already in use")
                    await conn.execute(
                        "UPDATE users SET email = $1, updated_at = NOW() WHERE username = $2",
                        new_email, username
                    )

                if new_password:
                    if len(new_password) < 8 or not re.search(r"[A-Z]", new_password) or not re.search(r"[0-9]", new_password):
                        raise ValueError("Password must be at least 8 characters with 1 uppercase and 1 number")
                    new_hash = bcrypt.hash(new_password, rounds=12)
                    await conn.execute(
                        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2",
                        new_hash, username
                    )

                await conn.execute(
                    "DELETE FROM refresh_tokens WHERE username = $1",
                    username
                )

        return {"message": "Account updated"}

    async def delete_account(self, username: str, current_password: str) -> dict:
        """Soft delete user account."""
        if not current_password:
            raise ValueError("Current password required")

        if self.db:
            async with self.db.pool.acquire() as conn:
                user = await conn.fetchrow(
                    "SELECT password_hash FROM users WHERE username = $1",
                    username
                )
                if not user or not bcrypt.verify(current_password, user["password_hash"]):
                    raise ValueError("Invalid password")
                
                await conn.execute(
                    """UPDATE users SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
                       WHERE username = $1""",
                    username
                )
                
                await conn.execute(
                    "DELETE FROM refresh_tokens WHERE username = $1",
                    username
                )

        return {"message": "Account deleted"}

    async def test_discord_webhook(self, username: str) -> dict:
        """Test Discord webhook."""
        if self.db:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT discord_webhook FROM user_settings WHERE username = $1",
                    username
                )
                webhook = row["discord_webhook"] if row else None
        else:
            webhook = None

        if not webhook:
            raise ValueError("No webhook configured")

        success = await self._test_discord_webhook(webhook)
        if not success:
            raise ValueError(f"Webhook test failed")

        return {"message": "Test alert sent."}

    async def get_billing(self, username: str) -> dict:
        """Get user billing info."""
        if self.db:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """SELECT plan, trial_ends_at, subscription_active_until, status, created_at
                       FROM users WHERE username = $1 AND status != 'deleted'""",
                    username
                )
                if not row:
                    raise ValueError("User not found")
                
                plan = row["plan"] or "trial"
                status = row["status"] or "active"
                trial_ends_at = row["trial_ends_at"]
                subscription_until = row["subscription_active_until"]
                
                symbols_used_row = await conn.fetchrow(
                    "SELECT COUNT(*) as cnt FROM user_symbols WHERE username = $1",
                    username
                )
                symbols_used = symbols_used_row["cnt"] if symbols_used_row else 0
                
                renewal_date = None
                if subscription_until:
                    renewal_date = subscription_until.isoformat()
                elif trial_ends_at:
                    renewal_date = trial_ends_at.isoformat()
                
                trial_remaining = None
                if plan == "trial" and trial_ends_at:
                    from datetime import datetime, timezone
                    remaining = (trial_ends_at - datetime.now(timezone.utc)).days
                    trial_remaining = max(0, remaining)
                
                grace_days_remaining = None
                grace_period_status = None
                if status == "grace_period":
                    grace_days_remaining = 7
                
                return {
                    "plan": plan,
                    "status": status,
                    "renewalDate": renewal_date,
                    "trialRemaining": trial_remaining,
                    "symbolsUsed": symbols_used,
                    "gracePeriod": grace_period_status,
                    "graceDaysRemaining": grace_days_remaining
                }
        
        return {
            "plan": "trial",
            "status": "active",
            "renewalDate": None,
            "trialRemaining": None,
            "symbolsUsed": 0,
            "gracePeriod": None,
            "graceDaysRemaining": None
        }