import json
import logging
from typing import Any, Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)


class Cache:
    def __init__(self):
        self._redis: Optional[redis.Redis] = None

    async def init(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None
    ) -> None:
        self._redis = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=True
        )
        await self._redis.ping()
        logger.info("Cache initialized")

    async def set(self, key: str, value: Any, ttl: int) -> None:
        if self._redis is None:
            raise RuntimeError("Cache not initialized")
        serialized = json.dumps(value) if not isinstance(value, str) else value
        await self._redis.setex(key, ttl, serialized)

    async def get(self, key: str) -> Optional[Any]:
        if self._redis is None:
            raise RuntimeError("Cache not initialized")
        value = await self._redis.get(key)
        if value is None:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    async def delete(self, key: str) -> None:
        if self._redis is None:
            raise RuntimeError("Cache not initialized")
        await self._redis.delete(key)

    async def exists(self, key: str) -> bool:
        if self._redis is None:
            raise RuntimeError("Cache not initialized")
        return await self._redis.exists(key) > 0

    async def incr(self, key: str, amount: int = 1) -> int:
        if self._redis is None:
            raise RuntimeError("Cache not initialized")
        return await self._redis.incrby(key, amount)

    async def expire(self, key: str, ttl: int) -> None:
        if self._redis is None:
            raise RuntimeError("Cache not initialized")
        await self._redis.expire(key, ttl)

    async def close(self) -> None:
        if self._redis:
            await self._redis.close()
            logger.info("Cache closed")


_cache: Optional[Cache] = None


async def init_cache(
    host: str = "localhost",
    port: int = 6379,
    db: int = 0,
    password: Optional[str] = None
) -> Cache:
    global _cache
    _cache = Cache()
    await _cache.init(host, port, db, password)
    return _cache


def get_cache() -> Cache:
    if _cache is None:
        raise RuntimeError("Cache not initialized - call init_cache() first")
    return _cache