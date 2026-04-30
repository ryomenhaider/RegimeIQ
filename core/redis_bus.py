import json
import logging
from typing import Any, Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)


class RedisBus:
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._default_maxlen: int = 10000

    async def init(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        stream_maxlen: int = 10000
    ) -> None:
        self._redis = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=True
        )
        self._default_maxlen = stream_maxlen
        await self._redis.ping()
        logger.info("RedisBus initialized")

    async def publish(
        self,
        stream: str,
        data: dict[str, Any],
        maxlen: Optional[int] = None
    ) -> str:
        if self._redis is None:
            raise RuntimeError("Redis not initialized")
        msg_id = await self._redis.xadd(
            stream,
            {"data": json.dumps(data)},
            maxlen=maxlen or self._default_maxlen,
            approximate=True
        )
        return msg_id

    async def consume(
        self,
        stream: str,
        last_id: str = "0-0",
        count: int = 100
    ) -> dict[str, dict[str, str]]:
        if self._redis is None:
            raise RuntimeError("Redis not initialized")
        result = await self._redis.xread({stream: last_id}, count=count)
        if not result:
            return {}
        messages = {}
        for stream_name, stream_data in result:
            for msg_id, msg_fields in stream_data:
                messages[msg_id] = msg_fields
        return messages

    async def get_latest(self, stream: str) -> Optional[tuple[str, dict[str, str]]]:
        if self._redis is None:
            raise RuntimeError("Redis not initialized")
        entries = await self._redis.xrevrange(stream, "+", "-", count=1)
        if not entries:
            return None
        msg_id, fields = entries[0]
        return msg_id, fields

    async def close(self) -> None:
        if self._redis:
            await self._redis.close()
            logger.info("RedisBus closed")

    @property
    def redis(self) -> redis.Redis:
        if self._redis is None:
            raise RuntimeError("Redis not initialized")
        return self._redis


_redis_bus: Optional[RedisBus] = None


async def init_redis(
    host: str = "localhost",
    port: int = 6379,
    db: int = 0,
    password: Optional[str] = None,
    stream_maxlen: int = 10000
) -> RedisBus:
    global _redis_bus
    _redis_bus = RedisBus()
    await _redis_bus.init(host, port, db, password, stream_maxlen)
    return _redis_bus


def get_redis() -> RedisBus:
    if _redis_bus is None:
        raise RuntimeError("RedisBus not initialized - call init_redis() first")
    return _redis_bus