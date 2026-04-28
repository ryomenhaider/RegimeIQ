import os
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Optional
from functools import lru_cache

import asyncpg
import redis.asyncio as redis
from python_dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class DatabaseConfig:
    host: str = field(default_factory=lambda: os.getenv("POSTGRES_HOST", "localhost"))
    port: int = field(default_factory=lambda: int(os.getenv("POSTGRES_PORT", "5432")))
    user: str = field(default_factory=lambda: os.getenv("POSTGRES_USER", "vektor"))
    password: str = field(default_factory=lambda: os.getenv("POSTGRES_PASSWORD", "vektor"))
    database: str = field(default_factory=lambda: os.getenv("POSTGRES_DB", "vektor"))
    min_size: int = field(default_factory=lambda: int(os.getenv("POSTGRES_POOL_MIN", "5")))
    max_size: int = field(default_factory=lambda: int(os.getenv("POSTGRES_POOL_MAX", "20")))


@dataclass
class RedisConfig:
    host: str = field(default_factory=lambda: os.getenv("REDIS_HOST", "localhost"))
    port: int = field(default_factory=lambda: int(os.getenv("REDIS_PORT", "6379")))
    db: int = field(default_factory=lambda: int(os.getenv("REDIS_DB", "0")))
    password: Optional[str] = field(default_factory=lambda: os.getenv("REDIS_PASSWORD"))


@dataclass
class RuntimeConfig:
    orderbook_levels: dict[str, int] = field(default_factory=lambda: {"BTCUSDT": 50, "default": 20})
    batch_sizes: dict[str, int] = field(default_factory=lambda: {"alt_data": 50})
    binance_ws_endpoint: str = "wss://stream.binance.com:9443/ws"
    reddit_poll_interval: int = 300
    google_trends_poll_interval: int = 3600
    fred_poll_interval: int = 86400


class Config:
    _instance: Optional["Config"] = None
    _pool: Optional[asyncpg.Pool] = None
    _redis: Optional[redis.Redis] = None
    _behavioral_config: dict[str, Any] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "_initialized"):
            self.db = DatabaseConfig()
            self.redis_cfg = RedisConfig()
            self.runtime = RuntimeConfig()
            self._initialized = True

    async def initialize(self) -> None:
        await self._init_db_pool()
        await self._connect_redis()
        await self._load_behavioral_config()

    async def _init_db_pool(self) -> None:
        dsn = f"postgresql://{self.db.user}:{self.db.password}@{self.db.host}:{self.db.port}/{self.db.database}"
        self._pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=self.db.min_size,
            max_size=self.db.max_size,
        )
        logger.info("Database connection pool initialized")

    async def _connect_redis(self) -> None:
        self._redis = redis.Redis(
            host=self.redis_cfg.host,
            port=self.redis_cfg.port,
            db=self.redis_cfg.db,
            password=self.redis_cfg.password,
            decode_responses=True,
        )
        await self._redis.ping()
        logger.info("Redis connected")

    async def _load_behavioral_config(self) -> None:
        if self._pool is None:
            raise RuntimeError("Database pool not initialized")

        async with self._pool.acquire() as conn:
            rows = await conn.fetch("SELECT key, value FROM system_config")
            for row in rows:
                self._behavioral_config[row["key"]] = row["value"]
        logger.info(f"Loaded {len(self._behavioral_config)} behavioral config entries")

    async def refresh_behavioral_config(self) -> None:
        await self._load_behavioral_config()
        logger.info("Behavioral config refreshed")

    def get(self, key: str, default: Any = None) -> Any:
        return self._behavioral_config.get(key, default)

    def get_symbols(self) -> list[str]:
        return self.get("symbols", ["BTCUSDT", "ETHUSDT"])

    def get_orderbook_levels(self, symbol: str) -> int:
        levels = self.orderbook_levels.copy()
        levels.update(self.get("orderbook_levels", {}))
        return levels.get(symbol, levels.get("default", 20))

    def get_batch_size(self, category: str = "alt_data") -> int:
        sizes = self.runtime.batch_sizes.copy()
        sizes.update(self.get("batch_sizes", {}))
        return sizes.get(category, 50)

    @property
    def pool(self) -> asyncpg.Pool:
        if self._pool is None:
            raise RuntimeError("Database pool not initialized")
        return self._pool

    @property
    def redis(self) -> redis.Redis:
        if self._redis is None:
            raise RuntimeError("Redis not connected")
        return self._redis

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
        if self._redis:
            await self._redis.close()
        logger.info("Connections closed")


config = Config()


def get_config() -> Config:
    return config