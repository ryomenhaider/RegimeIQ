from dataclasses import dataclass, field
from typing import Optional, Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel


security = HTTPBearer()


class CurrentUser(BaseModel):
    user_id: str = ""
    username: str
    plan: str = "free"
    is_admin: bool = False
    jti: str = ""
    symbols: list[str] = field(default_factory=list)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> CurrentUser:
    from api.services.factory import get_services

    services = get_services()
    auth_service = services.auth

    token = credentials.credentials
    payload = auth_service.verify_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    username = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user_symbols = []
    if services and services.symbols:
        try:
            user_symbols = await services.symbols.get_user_symbols(username)
            user_symbols = [s["symbol"] for s in user_symbols] if user_symbols else ["BTCUSDT", "ETHUSDT"]
        except Exception:
            user_symbols = ["BTCUSDT", "ETHUSDT"]
    else:
        user_symbols = ["BTCUSDT", "ETHUSDT"]

    return CurrentUser(
        username=username,
        user_id=payload.get("user_id", ""),
        plan=payload.get("plan", "free"),
        is_admin=payload.get("is_admin", False),
        jti=payload.get("jti", ""),
        symbols=user_symbols
    )


async def validate_symbol(
    symbol: str,
    user: Annotated[CurrentUser, Depends(get_current_user)]
) -> str:
    if symbol not in user.symbols:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Symbol {symbol} not in watched list"
        )
    return symbol