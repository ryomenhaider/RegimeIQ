import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Optional

import websockets
from websockets.server import WebSocketServerProtocol

from core.redis_bus import get_redis

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self._clients: dict[str, set[WebSocketServerProtocol]] = {}
        self._tasks: dict[str, asyncio.Task] = {}
        self._regime_tasks: dict[str, asyncio.Task] = {}
        self._altdata_tasks: dict[str, asyncio.Task] = {}
        self._llm_tasks: dict[str, asyncio.Task] = {}
        self._client_alert_thresholds: dict[int, float] = {}
        self._all_clients: set[WebSocketServerProtocol] = set()
        self._last_summary_value: str = ""
        self._running = False
        self._server: Optional[websockets.WebSocketServer] = None

    async def start(self, host: str = "0.0.0.0", port: int = 8765) -> None:
        self._running = True
        self._server = await websockets.serve(
            self._handle_connection,
            host,
            port
        )
        self._altdata_tasks["confluence"] = asyncio.create_task(
            self._consume_confluence_stream()
        )
        self._altdata_tasks["signals"] = asyncio.create_task(
            self._consume_signals_stream()
        )
        self._llm_tasks["insights"] = asyncio.create_task(
            self._consume_llm_insights_stream()
        )
        self._llm_tasks["summary"] = asyncio.create_task(
            self._consume_summary_loop()
        )
        logger.info(f"WebSocket server started on {host}:{port}")

    async def stop(self) -> None:
        self._running = False
        for task in self._tasks.values():
            task.cancel()
        for task in self._regime_tasks.values():
            task.cancel()
        for task in self._altdata_tasks.values():
            task.cancel()
        for task in self._llm_tasks.values():
            task.cancel()
        all_tasks = (
            list(self._tasks.values()) +
            list(self._regime_tasks.values()) +
            list(self._altdata_tasks.values()) +
            list(self._llm_tasks.values())
        )
        await asyncio.gather(*all_tasks, return_exceptions=True)
        self._tasks.clear()
        self._regime_tasks.clear()
        self._altdata_tasks.clear()
        self._llm_tasks.clear()
        self._all_clients.clear()
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
        alert_threshold = 0.7

        try:
            async for message in websocket:
                data = json.loads(message)

                if data.get("type") == "auth":
                    user_symbols = data.get("symbols", ["BTCUSDT", "ETHUSDT"])
                    alert_threshold = data.get("alert_threshold", 0.7)
                    self._client_alert_thresholds[client_id] = alert_threshold
                    self._all_clients.add(websocket)

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

                elif data.get("type") == "set_alert_threshold":
                    alert_threshold = data.get("threshold", 0.7)
                    self._client_alert_thresholds[client_id] = alert_threshold

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            for symbol in user_symbols:
                self.unsubscribe(websocket, symbol)
            self._all_clients.discard(websocket)
            if client_id in self._client_alert_thresholds:
                del self._client_alert_thresholds[client_id]

    def subscribe(
        self,
        client: WebSocketServerProtocol,
        symbol: str
    ) -> None:
        symbol = symbol.upper()
        if symbol not in self._clients:
            self._clients[symbol] = set()
            self._tasks[symbol] = asyncio.create_task(
                self._consume_microstructure_stream(symbol)
            )
            self._regime_tasks[symbol] = asyncio.create_task(
                self._consume_regime_stream(symbol)
            )
            logger.info(f"Started consumers for {symbol}")

        self._clients[symbol].add(client)

    def unsubscribe(
        self,
        client: WebSocketServerProtocol,
        symbol: str
    ) -> None:
        symbol = symbol.upper()
        if symbol in self._clients:
            self._clients[symbol].discard(client)
            if not self._clients[symbol]:
                del self._clients[symbol]
                if symbol in self._tasks:
                    self._tasks[symbol].cancel()
                    del self._tasks[symbol]
                if symbol in self._regime_tasks:
                    self._regime_tasks[symbol].cancel()
                    del self._regime_tasks[symbol]
                logger.info(f"Stopped consumers for {symbol}")

    async def _consume_microstructure_stream(self, symbol: str) -> None:
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
                logger.error(f"Microstructure stream error for {symbol}: {e}")
                await asyncio.sleep(1)

    async def _consume_regime_stream(self, symbol: str) -> None:
        redis = get_redis()
        stream_key = f"regime:{symbol}"
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
                        data["type"] = "regime_update"

                        regime_payload = json.dumps(data)

                        if symbol in self._clients:
                            disconnected = set()
                            for client in self._clients[symbol]:
                                client_id = id(client)
                                threshold = self._client_alert_thresholds.get(
                                    client_id, 0.7
                                )

                                try:
                                    await client.send(regime_payload)

                                    if data.get("transition_warning") and data.get("confidence", 0.0) > threshold:
                                        await self._push_alert(client, data, threshold)

                                except Exception:
                                    disconnected.add(client)

                            for client in disconnected:
                                self.unsubscribe(client, symbol)

                        last_id = msg_id

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Regime stream error for {symbol}: {e}")
                await asyncio.sleep(1)

    async def _consume_confluence_stream(self) -> None:
        redis = get_redis()
        stream_key = "altdata:confluence"
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
                        data["type"] = "altdata_confluence"

                        payload = json.dumps(data)

                        if self._all_clients:
                            disconnected = set()
                            for client in self._all_clients:
                                try:
                                    await client.send(payload)

                                    if data.get("alert_triggered"):
                                        await self._push_confluence_alert(client, data)

                                except Exception:
                                    disconnected.add(client)

                            for client in disconnected:
                                self._all_clients.discard(client)

                        last_id = msg_id

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Confluence stream error: {e}")
                await asyncio.sleep(1)

    async def _consume_signals_stream(self) -> None:
        redis = get_redis()
        stream_key = "altdata:signals"
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

                        output = {
                            "type": "altdata_signal",
                            "source": data.get("source", ""),
                            "score": data.get("score", 0.0),
                            "z_score": data.get("z_score", 0.0),
                            "velocity_z": data.get("velocity_z", 0.0),
                            "lead_lag": data.get("lead_lag", "coincident"),
                            "updated_at": data.get("updated_at", "")
                        }

                        payload = json.dumps(output)

                        if self._all_clients:
                            disconnected = set()
                            for client in self._all_clients:
                                try:
                                    await client.send(payload)
                                except Exception:
                                    disconnected.add(client)

                            for client in disconnected:
                                self._all_clients.discard(client)

                        last_id = msg_id

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Signals stream error: {e}")
                await asyncio.sleep(1)

    async def _push_confluence_alert(
        self,
        client: WebSocketServerProtocol,
        confluence_data: dict[str, Any]
    ) -> None:
        """Push alert for confluence spike."""
        score = confluence_data.get("score", 0.0)
        direction = confluence_data.get("direction", "neutral")
        sources = confluence_data.get("sources", {})

        agree_count = sum(
            1 for s in sources.values()
            if (score > 0 and s.get("score", 0) > 0) or
               (score < 0 and s.get("score", 0) < 0)
        )

        severity = "amber" if abs(score) < 0.9 else "red"
        message = f"Alt data confluence spike: {score:.2f} {direction} — {agree_count} sources agree"

        alert = {
            "type": "alert",
            "severity": severity,
            "message": message
        }

        await client.send(json.dumps(alert))

    async def _push_alert(
        self,
        client: WebSocketServerProtocol,
        regime_data: dict[str, Any],
        threshold: float
    ) -> None:
        """Push alert message for transition warning."""
        symbol = regime_data.get("symbol", "UNKNOWN")
        regime = regime_data.get("regime", "unknown")
        confidence = regime_data.get("confidence", 0.0)
        transition_probs = regime_data.get("transition_probabilities", {})

        other_probs = {
            k: v for k, v in transition_probs.items()
            if k != regime
        }
        max_other = max(other_probs.items(), key=lambda x: x[1]) if other_probs else (None, 0.0)
        next_regime, next_prob = max_other

        severity = "amber" if confidence < 0.9 else "red"

        message = f"Regime transition warning: {regime} → {next_regime} probability {next_prob:.2f}"

        alert = {
            "type": "alert",
            "symbol": symbol,
            "severity": severity,
            "message": message
        }

        await client.send(json.dumps(alert))

    async def _consume_llm_insights_stream(self) -> None:
        redis = get_redis()
        stream_key = "llm:insights"
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
                        data["type"] = "llm_insight"

                        payload = json.dumps(data)

                        if self._all_clients:
                            disconnected = set()
                            for client in self._all_clients:
                                try:
                                    await client.send(payload)
                                except Exception:
                                    disconnected.add(client)

                            for client in disconnected:
                                self._all_clients.discard(client)

                        last_id = msg_id

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"LLM insights stream error: {e}")
                await asyncio.sleep(1)

    async def _consume_summary_loop(self) -> None:
        redis = get_redis()
        SUMMARY_KEY = "llm:summary"
        SUMMARY_INTERVAL = 30

        while self._running:
            try:
                data = await redis.redis.get(SUMMARY_KEY)

                if data and data != self._last_summary_value:
                    self._last_summary_value = data
                    summary_data = json.loads(data)

                    payload = json.dumps({
                        "type": "summary_update",
                        "text": summary_data.get("summary", ""),
                        "timestamp": summary_data.get("timestamp", "")
                    })

                    if self._all_clients:
                        disconnected = set()
                        for client in self._all_clients:
                            try:
                                await client.send(payload)
                            except Exception:
                                disconnected.add(client)

                        for client in disconnected:
                            self._all_clients.discard(client)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Summary polling error: {e}")

            await asyncio.sleep(SUMMARY_INTERVAL)


_ws_manager: Optional[WebSocketManager] = None


async def init_websocket() -> "WebSocketManager":
    global _ws_manager
    _ws_manager = WebSocketManager()
    return _ws_manager


def get_ws_manager() -> WebSocketManager:
    if _ws_manager is None:
        raise RuntimeError("WebSocketManager not initialized")
    return _ws_manager