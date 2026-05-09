"""WebSocket service - real-time data push."""

import asyncio
import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional, Set

from fastapi import WebSocket, WebSocketDisconnect
import hmac
import hashlib
import base64
import json
import logging

logger = logging.getLogger(__name__)

logger = logging.getLogger(__name__)


@dataclass
class WebSocketClient:
    websocket: WebSocket
    username: str
    subscriptions: Set[str] = field(default_factory=set)
    connected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_ping_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    client_id: str = ""


class WebSocketManager:
    def __init__(self, db=None, redis=None):
        self.db = db
        self.redis = redis
        self._clients: dict[str, WebSocketClient] = {}
        self._tasks: dict[str, asyncio.Task] = {}
        self._running = False

    async def handle_connection(self, websocket: WebSocket) -> None:
        await websocket.accept()
        client_id = str(uuid.uuid4())
        client = WebSocketClient(
            websocket=websocket,
            username="",
            client_id=client_id
        )
        
        authenticated = False
        
        try:
            auth_message = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=5.0
            )
            
            if auth_message.get("type") != "auth":
                await websocket.close(code=4000, reason="Expected auth message")
                return
            
            token = auth_message.get("token", "")
            if not token:
                await websocket.close(code=4001, reason="Unauthorized")
                return
            
            user = await self._validate_token(token)
            if not user:
                await websocket.close(code=4001, reason="Unauthorized")
                return
            
            client.username = user["username"]
            self._clients[client_id] = client
            authenticated = True
            
            user_symbols = await self._get_user_symbols(user["username"])
            for symbol in user_symbols:
                client.subscriptions.add(symbol.upper())
            
            await websocket.send(json.dumps({
                "type": "auth_success",
                "username": client.username,
                "symbols": list(client.subscriptions)
            }))
            
            asyncio.create_task(self._handle_client_messages(client_id))
            asyncio.create_task(self._heartbeat_check(client_id))
            asyncio.create_task(self._stream_bridge(client_id))
            
        except asyncio.TimeoutError:
            await websocket.close(code=4000, reason="Auth timeout")
        except Exception as e:
            logger.error(f"WebSocket auth error: {e}")
            if authenticated and client_id in self._clients:
                del self._clients[client_id]
        finally:
            if client_id in self._clients:
                del self._clients[client_id]

    async def _validate_token(self, token: str) -> Optional[dict]:
        try:
            parts = token.split(".")
            if len(parts) != 2:
                return None

            payload_b64, signature = parts

            jwt_secret = os.getenv("JWT_SECRET")
            if jwt_secret:
                expected_signature = hmac.new(
                    jwt_secret.encode(),
                    payload_b64.encode(),
                    hashlib.sha256
                ).hexdigest()
                if not hmac.compare_digest(signature, expected_signature):
                    return None

            import json as _json
            payload = _json.loads(base64.urlsafe_b64decode(payload_b64.encode() + b"=="))

            username = payload.get("sub") or payload.get("username")
            if not username:
                return None

            if self.redis:
                jti = payload.get("jti", "")
                if jti and await self.redis.get(f"blacklist:{jti}"):
                    return None

            return {"username": username, "plan": payload.get("plan", "free")}
        except Exception:
            return None

    async def _get_user_symbols(self, username: str) -> list[str]:
        if not self.db:
            return ["BTCUSDT", "ETHUSDT"]
        
        try:
            async with self.db.pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT symbol FROM user_symbols WHERE username = $1",
                    username
                )
                return [r["symbol"] for r in rows] if rows else ["BTCUSDT", "ETHUSDT"]
        except Exception:
            return ["BTCUSDT", "ETHUSDT"]

    async def _handle_client_messages(self, client_id: str) -> None:
        client = self._clients.get(client_id)
        if not client:
            return
        
        try:
            while True:
                message = await client.websocket.receive_json()
                msg_type = message.get("type")
                
                if msg_type == "subscribe":
                    symbol = message.get("symbol", "").upper()
                    if symbol:
                        client.subscriptions.add(symbol)
                
                elif msg_type == "unsubscribe":
                    symbol = message.get("symbol", "").upper()
                    client.subscriptions.discard(symbol)
                
                elif msg_type == "ping":
                    client.last_ping_at = datetime.now(timezone.utc)
                    await client.websocket.send_json({"type": "pong"})
                
                else:
                    logger.debug(f"Unknown message type: {msg_type}")
        
        except WebSocketDisconnect:
            pass
        except json.JSONDecodeError:
            logger.warning(f"Malformed JSON from {client.username}")
        finally:
            await self._cleanup_client(client_id)

    async def _heartbeat_check(self, client_id: str) -> None:
        await asyncio.sleep(65)
        client = self._clients.get(client_id)
        if client:
            last_ping = client.last_ping_at
            if (datetime.now(timezone.utc) - last_ping).total_seconds() > 60:
                try:
                    await client.websocket.close(code=1001, reason="Going Away")
                except Exception:
                    pass
                await self._cleanup_client(client_id)

    async def _cleanup_client(self, client_id: str) -> None:
        if client_id in self._clients:
            client = self._clients[client_id]
            duration = (datetime.now(timezone.utc) - client.connected_at).total_seconds()
            logger.info(f"Client disconnected: {client.username}, duration={duration:.1f}s")
            del self._clients[client_id]

    async def _stream_bridge(self, client_id: str) -> None:
        client = self._clients.get(client_id)
        if not client:
            return
        
        while client_id in self._clients:
            try:
                for symbol in list(client.subscriptions):
                    micro_key = f"microstructure:{symbol}"
                    regime_key = f"regime:{symbol}"

                    if self.redis:
                        micro_data = await self.redis.get(micro_key)
                        if micro_data:
                            try:
                                data = json.loads(micro_data) if isinstance(micro_data, str) else micro_data
                                await client.websocket.send_json({"type": "microstructure", **data})
                            except Exception:
                                pass

                        regime_data = await self.redis.get(regime_key)
                        if regime_data:
                            try:
                                data = json.loads(regime_data) if isinstance(regime_data, str) else regime_data
                                await client.websocket.send_json({"type": "regime", **data})
                            except Exception:
                                pass

                confluence = await self.redis.get("altdata:confluence") if self.redis else None
                if confluence:
                    try:
                        data = json.loads(confluence) if isinstance(confluence, str) else confluence
                        await client.websocket.send_json({"type": "confluence", **data})
                        if data.get("alert_triggered"):
                            await client.websocket.send_json({"type": "alert", **data})
                    except Exception:
                        pass

                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Stream bridge error: {e}")
                break

    async def start(self) -> None:
        self._running = True
        logger.info("WebSocket manager started")

    async def stop(self) -> None:
        self._running = False
        for task in self._tasks.values():
            task.cancel()
        self._tasks.clear()
        self._clients.clear()
        logger.info("WebSocket manager stopped")

    async def broadcast_to_all(self, message: dict) -> None:
        for client in self._clients.values():
            try:
                await client.websocket.send_json(message)
            except Exception:
                pass

    async def broadcast_to_symbol(self, symbol: str, message: dict) -> None:
        symbol = symbol.upper()
        for client in self._clients.values():
            if symbol in client.subscriptions:
                try:
                    await client.websocket.send_json(message)
                except Exception:
                    pass