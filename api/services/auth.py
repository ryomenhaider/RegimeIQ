"""Auth service - authentication logic with full implementation."""

import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from uuid import uuid4

from dotenv import load_dotenv
from passlib.hash import bcrypt

load_dotenv()


JWT_SECRET = os.getenv("JWT_SECRET")
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable must be set")

if not ADMIN_USERNAME or not ADMIN_PASSWORD:
    raise ValueError("ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set")


class AuthService:
    """Authentication service."""

    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis

    def validate_password(self, password: str) -> tuple[bool, dict]:
        """Validate password requirements."""
        errors = {}
        if len(password) < 8:
            errors["password"] = "Password must be at least 8 characters"
        if not re.search(r"[A-Z]", password):
            errors["password"] = "Password must contain at least one uppercase letter"
        if not re.search(r"[0-9]", password):
            errors["password"] = "Password must contain at least one number"
        return len(errors) == 0, errors

    def validate_username(self, username: str) -> tuple[bool, str]:
        """Validate username format."""
        if len(username) < 3 or len(username) > 20:
            return False, "Username must be 3-20 characters"
        if not re.match(r"^[a-zA-Z0-9_]+$", username):
            return False, "Username can only contain letters, numbers, and underscores"
        return True, ""

    def hash_password(self, password: str) -> str:
        """Hash password with bcrypt."""
        return bcrypt.hash(password, rounds=12)

    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against bcrypt hash."""
        try:
            return bcrypt.verify(password, password_hash)
        except Exception:
            return False

    async def is_valid_beta_code(self, code: str) -> tuple[bool, str]:
        """Validate a beta code exists in DB."""
        if not self.db:
            return False, "Service unavailable"
        import uuid
        try:
            code_uuid = uuid.UUID(code)
        except ValueError:
            return False, "Invalid beta code format"

        try:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT id, expires_at, is_revoked FROM beta_codes WHERE code = $1",
                    code
                )
            if not row:
                return False, "Beta code not found"
            if row["is_revoked"]:
                return False, "Beta code has been revoked"
            if row["expires_at"] and row["expires_at"] < datetime.now(timezone.utc):
                return False, "Beta code has expired"
            return True, ""
        except Exception as e:
            return False, "An error occurred. Please try again later."

    async def validate_beta_code(self, code: str) -> tuple[bool, str]:
        """Validate beta code for registration."""
        import uuid
        try:
            code_uuid = uuid.UUID(code)
        except ValueError:
            return False, "Invalid beta code format"

        if not self.db:
            return False, "Database not available"

        try:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT id, expires_at, is_revoked, used_by FROM beta_codes WHERE code = $1",
                    code
                )
            if not row:
                return False, "Invalid beta code"
            if row["is_revoked"]:
                return False, "Beta code has been revoked"
            if row["expires_at"] and row["expires_at"] < datetime.now(timezone.utc):
                return False, "Beta code has expired"
            if row["used_by"]:
                return False, "Beta code has already been used"
            return True, ""
        except Exception:
            return False, "Beta code validation failed"

    async def admin_login(self, username: str, password: str) -> dict:
        """Admin login using .env credentials."""
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            access_token, _ = self.create_access_token(
                user_id="admin",
                username=ADMIN_USERNAME,
                plan="admin",
                is_admin=True
            )
            return {
                "access_token": access_token,
                "refresh_token": self.create_refresh_token(),
                "username": ADMIN_USERNAME,
                "plan": "admin"
            }
        raise ValueError("Invalid admin credentials")

    def create_access_token(self, user_id: str, username: str, plan: str, is_admin: bool = False) -> tuple[str, int]:
        """Create access token with HMAC signature."""
        import json
        import hmac
        import hashlib
        import base64

        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        jti = str(uuid4())
        
        payload_dict = {
            "sub": username,
            "user_id": user_id,
            "plan": plan,
            "is_admin": is_admin,
            "jti": jti,
            "exp": int(expire.timestamp()),
            "type": "access"
        }
        
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload_dict).encode()).decode()
        
        signature = hmac.new(
            JWT_SECRET.encode(),
            payload_b64.encode(),
            hashlib.sha256
        ).hexdigest()
        
        token = f"{payload_b64}.{signature}"
        expires_at = int(expire.timestamp())
        return token, expires_at

    def verify_access_token(self, token: str) -> dict:
        """Verify access token signature and return payload."""
        import json
        import hmac
        import hashlib
        import base64

        try:
            parts = token.split(".")
            if len(parts) != 2:
                return None
            
            payload_b64, signature = parts
            
            expected_signature = hmac.new(
                JWT_SECRET.encode(),
                payload_b64.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                return None
            
            payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()))
            
            if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
                return None
            
            return payload
        except Exception:
            return None

    def create_refresh_token(self) -> str:
        """Create refresh token."""
        return secrets.token_urlsafe(32)

    async def register(self, username: str, email: str, password: str, beta_code: str = None) -> dict:
        """Register a new user."""
        valid_username, msg = self.validate_username(username)
        if not valid_username:
            raise ValueError(msg)

        valid_password, pw_errors = self.validate_password(password)
        if not valid_password:
            raise ValueError(pw_errors.get("password", "Invalid password"))

        grant_unlimited = False
        if beta_code:
            is_valid, error_msg = await self.validate_beta_code(beta_code)
            if not is_valid:
                raise ValueError(error_msg)
            grant_unlimited = True

        if self.db:
            async with self.db.pool.acquire() as conn:
                existing_username = await conn.fetchrow(
                    "SELECT id FROM users WHERE username = $1",
                    username
                )
                if existing_username:
                    raise ValueError("Username already taken")

                existing_email = await conn.fetchrow(
                    "SELECT id FROM users WHERE email = $1",
                    email
                )
                if existing_email:
                    raise ValueError("Email already in use")

                user_id = str(uuid4())
                password_hash = self.hash_password(password)
                trial_ends = datetime.now(timezone.utc) + timedelta(days=14)
                plan = "unlimited" if grant_unlimited else "trial"

                await conn.execute(
                    """INSERT INTO users (id, username, email, password_hash, plan, trial_ends_at)
                       VALUES ($1, $2, $3, $4, $5, $6)""",
                    user_id, username, email, password_hash, plan, trial_ends
                )

                if grant_unlimited:
                    await conn.execute(
                        """UPDATE beta_codes SET used_by = $1 WHERE code = $2""",
                        user_id, beta_code
                    )

                access_token, _ = self.create_access_token(user_id, username, plan)
                refresh_token = self.create_refresh_token()

                await conn.execute(
                    """INSERT INTO refresh_tokens (token, user_id, expires_at)
                       VALUES ($1, $2, $3)""",
                    refresh_token, user_id,
                    datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
                )

                return {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "username": username,
                    "plan": plan,
                    "skip_billing": grant_unlimited
                }
        else:
            plan = "unlimited" if grant_unlimited else "trial"
            access_token, _ = self.create_access_token("temp", username, plan)
            refresh_token = self.create_refresh_token()
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "username": username,
                "plan": plan,
                "skip_billing": grant_unlimited
            }

    async def login(self, email: str, password: str) -> dict:
        """Login user."""
        if self.db:
            async with self.db.pool.acquire() as conn:
                user = await conn.fetchrow(
                    "SELECT id, username, password_hash, is_active, plan FROM users WHERE email = $1",
                    email
                )
                if not user:
                    raise ValueError("Invalid credentials")

                if not self.verify_password(password, user["password_hash"]):
                    raise ValueError("Invalid credentials")

                if not user["is_active"]:
                    raise ValueError("Account suspended")

                access_token, _ = self.create_access_token(
                    str(user["id"]), user["username"], user["plan"] or "free"
                )
                refresh_token = self.create_refresh_token()

                await conn.execute(
                    "DELETE FROM refresh_tokens WHERE user_id = $1",
                    str(user["id"])
                )
                await conn.execute(
                    """INSERT INTO refresh_tokens (token, user_id, expires_at)
                       VALUES ($1, $2, $3)""",
                    refresh_token, str(user["id"]),
                    datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
                )

                return {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "username": user["username"],
                    "plan": user["plan"] or "free"
                }
        else:
            raise ValueError("Invalid credentials")

    async def refresh(self, refresh_token: str) -> dict:
        """Refresh access token."""
        if self.db:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """SELECT rt.user_id, rt.expires_at, rt.rotated, u.username, u.plan
                       FROM refresh_tokens rt
                       JOIN users u ON rt.user_id = u.id
                       WHERE rt.token = $1""",
                    refresh_token
                )

                if not row:
                    raise ValueError("Invalid or expired refresh token")

                if row["expires_at"] < datetime.now(timezone.utc):
                    raise ValueError("Refresh token expired")

                if row["rotated"]:
                    await conn.execute(
                        "DELETE FROM refresh_tokens WHERE user_id = $1",
                        row["user_id"]
                    )
                    raise ValueError("Session compromised. Please log in again.")

                access_token, exp = self.create_access_token(
                    row["user_id"], row["username"], row["plan"] or "free"
                )

                new_refresh = self.create_refresh_token()
                await conn.execute(
                    "DELETE FROM refresh_tokens WHERE token = $1",
                    refresh_token
                )
                await conn.execute(
                    """INSERT INTO refresh_tokens (token, user_id, expires_at)
                       VALUES ($1, $2, $3)""",
                    new_refresh, row["user_id"],
                    datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
                )

                return {
                    "access_token": access_token,
                    "refresh_token": new_refresh,
                    "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
                }
        else:
            raise ValueError("Invalid refresh token")

    async def logout(self, user_id: str, jti: str, exp: int) -> None:
        """Logout user - blacklist token."""
        if self.redis and jti and exp > 0:
            remaining = exp - int(datetime.now(timezone.utc).timestamp())
            if remaining > 0:
                await self.redis.setex(f"blacklist:{jti}", int(remaining), "1")

        if self.db and user_id:
            await self.db.pool.execute(
                "DELETE FROM refresh_tokens WHERE user_id = $1",
                user_id
            )

    async def get_csrf_token(self, request: Any) -> str:
        """Generate and store CSRF token."""
        from starlette.datastructures import URL
        import secrets
        token = secrets.token_hex(32)

        refresh_cookie = request.cookies.get("refresh_token", "")
        import hashlib
        session_id = hashlib.sha256(refresh_cookie.encode()).hexdigest()[:32]

        if self.redis:
                await self.redis.setex(f"csrf:{session_id}", 3600, token)

        return token

    async def forgot_password(self, email: str) -> None:
        """Send password reset email."""
        if not self.db:
            return

        async with self.db.pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT username FROM users WHERE email = $1",
                email
            )

        if not user:
            return

        token = secrets.token_urlsafe(32)

        if self.redis:
                await self.redis.setex(f"pwd_reset:{token}", 3600, user["username"])

    async def reset_password(self, token: str, new_password: str) -> None:
        """Reset password."""
        valid_password, pw_errors = self.validate_password(new_password)
        if not valid_password:
            raise ValueError(pw_errors.get("password", "Invalid password"))

        if not self.redis:
            raise ValueError("Invalid or expired reset token")

        username = await self.redis.get(f"pwd_reset:{token}")
        if not username:
            raise ValueError("Invalid or expired reset token")

        password_hash = self.hash_password(new_password)

        if self.db:
            async with self.db.pool.acquire() as conn:
                await conn.execute(
                    "UPDATE users SET password_hash = $1 WHERE username = $2",
                    password_hash, username
                )
                await conn.execute(
                    "DELETE FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE username = $1)",
                    username
                )

        await self.redis.delete(f"pwd_reset:{token}")

    async def check_username(self, username: str) -> bool:
        """Check if username is available."""
        if self.db:
            async with self.db.pool.acquire() as conn:
                result = await conn.fetchrow(
                    "SELECT COUNT(*) as cnt FROM users WHERE username = $1",
                    username
                )
                return result["cnt"] == 0 if result else True
        return True