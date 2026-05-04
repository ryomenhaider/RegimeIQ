"""
RedisBus - Stream-oriented message bus using Redis Streams.

WARNING: This module must NOT import from any other VektorLabs modules.
All inter-module communication must go through RedisBus.
This is a hard architectural rule — do not break it.
"""
import asyncio
import json
import logging
import os
from typing import Any, Callable, Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)

STREAM_MAXLEN = {
    "raw:orderbook": 5000,
    "raw:trades": 5000,
    "raw:futures": 1000,
    "raw:onchain": 500,
    "microstructure": 10000,
    "regime": 1000,
    "altdata:signals": 500,
    "altdata:confluence": 500,
    "llm:insights": 200,
}


class RedisBus:
    def __init__(self):
        self._pool: Optional[redis.ConnectionPool] = None
        self._redis: Optional[redis.Redis] = None

    async def init(self) -> None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self._pool = redis.ConnectionPool.from_url(
            redis_url,
            max_connections=10,
            decode_responses=True
        )
        self._redis = redis.Redis(connection_pool=self._pool)
        await self._redis.ping()
        logger.info("RedisBus initialized")

    def _get_maxlen(self, stream_key: str) -> int:
        for prefix, maxlen in STREAM_MAXLEN.items():
            if stream_key.startswith(prefix):
                return maxlen
        return 10000

    async def publish(self, stream_key: str, data: dict[str, Any]) -> str:
        if self._redis is None:
            raise RuntimeError("RedisBus not initialized")
        maxlen = self._get_maxlen(stream_key)
        msg_id = await self._redis.xadd(
            stream_key,
            {"data": json.dumps(data)},
            maxlen=maxlen,
            approximate=True
        )
        logger.debug(f"Published to {stream_key}: {msg_id}")
        return msg_id

    async def get_latest(self, stream_key: str) -> Optional[dict[str, Any]]:
        if self._redis is None:
            raise RuntimeError("RedisBus not initialized")
        entries = await self._redis.xrevrange(stream_key, "+", "-", count=1)
        if not entries:
            return None
        _, fields = entries[0]
        return json.loads(fields.get("data", "{}"))

    async def subscribe(
        self,
        stream_key: str,
        consumer_group: str,
        consumer_name: str,
        handler_fn: Callable[[list[dict[str, Any]]], None],
        batch_size: int = 10
    ) -> None:
        if self._redis is None:
            raise RuntimeError("RedisBus not initialized")

        try:
            await self._redis.xgroup_create(stream_key, consumer_group, id="0", mkstream=True)
            logger.info(f"Created consumer group {consumer_group} for {stream_key}")
        except redis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

        while True:
            try:
                messages = await self._redis.xreadgroup(
                    consumer_group,
                    consumer_name,
                    {stream_key: ">"},
                    count=batch_size,
                    block=5000
                )
                if not messages:
                    continue

                for stream_name, stream_messages in messages:
                    batch = []
                    for msg_id, fields in stream_messages:
                        batch.append({"id": msg_id, "data": json.loads(fields.get("data", "{}"))})

                    try:
                        await handler_fn(batch)
                    except Exception as e:
                        logger.error(f"Handler error: {e}")
                        continue

                    for msg in batch:
                        await self._redis.xack(stream_key, consumer_group, msg["id"])

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Subscribe error: {e}")
                await asyncio.sleep(1)

    async def close(self) -> None:
        if self._pool:
            await self._pool.disconnect()
            logger.info("RedisBus closed")


_redis_bus: Optional[RedisBus] = None


async def init_redis() -> "RedisBus":
    global _redis_bus
    _redis_bus = RedisBus()
    await _redis_bus.init()
    return _redis_bus


def get_redis() -> RedisBus:
    if _redis_bus is None:
        raise RuntimeError("RedisBus not initialized - call init_redis() first")
    return _redis_bus