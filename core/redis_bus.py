import json
import logging
from typing import Any, Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)


class RedisBus:
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._default_maxlen: int = 10000

    @property
    def redis(self) -> redis.Redis:
        if self._redis is None:
            raise RuntimeError("RedisBus not initialized")
        return self._redis

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
        """
        the function takes stream, data and max length as parameters
        and first checks whether redis is initialized or not
        then add the into the the redis stream
        """

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
        """
        the function takes stream, last_id and count as parameters
        and first checks whether redis is initialized or not and the stream has something to in it
        
        """
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

    async def publish_pubsub(self, channel: str, message: dict[str, Any]) -> int:
        if self._redis is None:
            raise RuntimeError("Redis not initialized")
        return await self._redis.publish(channel, json.dumps(message))

    async def subscribe(self, channel: str) -> "PubSubAsyncIterator":
        if self._redis is None:
            raise RuntimeError("Redis not initialized")
        return PubSubAsyncIterator(self._redis, channel)

    async def close(self) -> None:
        if self._redis:
            await self._redis.close()
            logger.info("RedisBus closed")


class PubSubAsyncIterator:
    def __init__(self, redis_client: redis.Redis, channel: str):
        self._pubsub = redis_client.pubsub()
        self._channel = channel
        self._listener = None

    async def __aenter__(self):
        await self._pubsub.subscribe(self._channel)
        self._listener = self._pubsub.listen()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._pubsub.unsubscribe(self._channel)
        await self._pubsub.close()

    def __aiter__(self):
        return self

    async def __anext__(self) -> dict[str, Any]:
        if self._listener is None:
            self._listener = self._pubsub.listen()
        message = await self._listener.__anext__()
        if message["type"] == "message":
            try:
                return json.loads(message["data"])
            except json.JSONDecodeError:
                logger.warning(f"Failed to decode pubsub message: {message['data']}")
                raise StopAsyncIteration
        raise StopAsyncIteration

    @staticmethod
    def decode_message(msg_fields: dict[str, str]) -> dict[str, Any]:
        data_str = msg_fields.get("data", "{}")
        try:
            return json.loads(data_str)
        except json.JSONDecodeError:
            logger.warning(f"Failed to decode message: {data_str}")
            return {}

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
