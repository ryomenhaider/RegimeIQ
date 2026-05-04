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
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    return CurrentUser(username=username, plan="free", symbols=["BTCUSDT", "ETHUSDT"])


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