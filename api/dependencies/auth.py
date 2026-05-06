from dataclasses import dataclass, field
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import base64
import json
import os


security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")


@dataclass
class CurrentUser:
    username: str
    plan: str = "free"
    is_admin: bool = False
    jti: str = ""
    symbols: list[str] = field(default_factory=lambda: ["BTCUSDT", "ETHUSDT"])


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    token = credentials.credentials

    try:
        data = base64.urlsafe_b64decode(token.encode())
        payload = json.loads(data.decode())
        username = payload.get("sub") or payload.get("username")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        plan = payload.get("plan", "free")
        jti = payload.get("jti", "")
        is_admin = payload.get("is_admin", False)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    return CurrentUser(
        username=username,
        plan=plan,
        is_admin=is_admin,
        jti=jti,
        symbols=["BTCUSDT", "ETHUSDT"]
    )


async def validate_symbol(
    symbol: str,
    user: CurrentUser = Depends(get_current_user)
) -> str:
    if symbol not in user.symbols:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Symbol {symbol} not in watched list"
        )
    return symbol