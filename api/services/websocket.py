import asyncio
import json
import logging
from datetime import datetime
from typing import Optional

import websockets
from websockets.server import WebSocketServerProtocol

from core.redis_bus import get_redis

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self._clients: dict[str, set[WebSocketServerProtocol]] = {}
        self._tasks: dict[str, asyncio.Task] = {}
        self._running = False
        self._server: Optional[websockets.WebSocketServer] = None

    async def start(self, host: str = "0.0.0.0", port: int = 8765) -> None:
        self._running = True
        self._server = await websockets.serve(
            self._handle_connection,
            host,
            port
        )
        logger.info(f"WebSocket server started on {host}:{port}")

    async def stop(self) -> None:
        self._running = False
        for task in self._tasks.values():
            task.cancel()
        await asyncio.gather(*self._tasks.values(), return_exceptions=True)
        self._tasks.clear()
        if self._server:
            self._server.close()
            await self._server.wait_closed()
        logger.info("WebSocket server stopped")

    async def _handle_connection(
        self,
        websocket: WebSocketServerProtocol,
        path: str
    ) -> None:
        client_id = id(websocket)
        user_symbols: list[str] = []

        try:
            async for message in websocket:
                data = json.loads(message)

                if data.get("type") == "auth":
                    user_symbols = data.get("symbols", ["BTCUSDT", "ETHUSDT"])
                    for symbol in user_symbols:
                        self.subscribe(websocket, symbol)
                    await websocket.send(json.dumps({
                        "type": "subscribed",
                        "symbols": user_symbols
                    }))

                elif data.get("type") == "subscribe":
                    symbol = data.get("symbol")
                    if symbol:
                        self.subscribe(websocket, symbol)
                        if symbol not in user_symbols:
                            user_symbols.append(symbol)

                elif data.get("type") == "unsubscribe":
                    symbol = data.get("symbol")
                    if symbol:
                        self.unsubscribe(websocket, symbol)
                        if symbol in user_symbols:
                            user_symbols.remove(symbol)

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            for symbol in user_symbols:
                self.unsubscribe(websocket, symbol)

    def subscribe(
        self,
        client: WebSocketServerProtocol,
        symbol: str
    ) -> None:
        if symbol not in self._clients:
            self._clients[symbol] = set()
            if symbol not in self._tasks:
                self._tasks[symbol] = asyncio.create_task(
                    self._consume_stream(symbol)
                )
                logger.info(f"Started consumer for {symbol}")

        self._clients[symbol].add(client)

    def unsubscribe(
        self,
        client: WebSocketServerProtocol,
        symbol: str
    ) -> None:
        if symbol in self._clients:
            self._clients[symbol].discard(client)
            if not self._clients[symbol]:
                del self._clients[symbol]
                if symbol in self._tasks:
                    self._tasks[symbol].cancel()
                    del self._tasks[symbol]
                    logger.info(f"Stopped consumer for {symbol}")

    async def _consume_stream(self, symbol: str) -> None:
        redis = get_redis()
        stream_key = f"microstructure:{symbol}"
        last_id = "0-0"

        while self._running:
            try:
                messages = await redis.redis.xread(
                    {stream_key: last_id},
                    count=1,
                    block=1000
                )

                if not messages:
                    continue

                for stream_name, stream_messages in messages:
                    for msg_id, fields in stream_messages:
                        data = json.loads(fields.get("data", "{}"))
                        data["type"] = "microstructure_update"

                        if "timestamp" in data:
                            ts = data["timestamp"]
                            if isinstance(ts, int):
                                data["timestamp"] = datetime.fromtimestamp(
                                    ts / 1000
                                ).isoformat()

                        payload = json.dumps(data)

                        if symbol in self._clients:
                            disconnected = set()
                            for client in self._clients[symbol]:
                                try:
                                    await client.send(payload)
                                except Exception:
                                    disconnected.add(client)
                            for client in disconnected:
                                self.unsubscribe(client, symbol)

                        last_id = msg_id

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Stream consumer error for {symbol}: {e}")
                await asyncio.sleep(1)


_ws_manager: Optional[WebSocketManager] = None


async def init_websocket() -> "WebSocketManager":
    global _ws_manager
    _ws_manager = WebSocketManager()
    return _ws_manager


def get_ws_manager() -> WebSocketManager:
    if _ws_manager is None:
        raise RuntimeError("WebSocketManager not initialized")
    return _ws_manager