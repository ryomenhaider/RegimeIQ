import os
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

import redis.asyncio as redis
from dotenv import load_dotenv

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
    timeout: int = field(default_factory=lambda: int(os.getenv("POSTGRES_TIMEOUT", "30")))

    @property
    def dsn(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


@dataclass
class RedisConfig:
    host: str = field(default_factory=lambda: os.getenv("REDIS_HOST", "localhost"))
    port: int = field(default_factory=lambda: int(os.getenv("REDIS_PORT", "6379")))
    db: int = field(default_factory=lambda: int(os.getenv("REDIS_DB", "0")))
    password: Optional[str] = field(default_factory=lambda: os.getenv("REDIS_PASSWORD"))
    stream_maxlen: int = field(default_factory=lambda: int(os.getenv("REDIS_STREAM_MAXLEN", "10000")))


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
    _redis: Optional[redis.Redis] = None
    _behavioral_config: dict[str, Any] = {}
    _reload_callbacks: list[Callable[[dict[str, Any]], None]] = []
    _db_initialized: bool = False

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

    @staticmethod
    def get_env(key: str, default: Any = None) -> Any:
        return os.getenv(key, default)

    async def initialize(self) -> None:
        from core.database import init_db
        await init_db(
            dsn=self.db.dsn,
            min_size=self.db.min_size,
            max_size=self.db.max_size,
            timeout=self.db.timeout
        )
        self._db_initialized = True
        await self._connect_redis()
        await self._load_behavioral_config()

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
        from core.database import get_db
        db = get_db()
        rows = await db.fetch("SELECT key, value FROM system_config")
        old_config = self._behavioral_config.copy()
        self._behavioral_config = {}
        for row in rows:
            self._behavioral_config[row["key"]] = row["value"]

        logger.info(f"Loaded {len(self._behavioral_config)} behavioral config entries")

        if old_config != self._behavioral_config:
            self._notify_callbacks(self._behavioral_config)

    def _notify_callbacks(self, new_config: dict[str, Any]) -> None:
        for callback in self._reload_callbacks:
            try:
                callback(new_config)
            except Exception as e:
                logger.error(f"Config reload callback error: {e}")

    def on_reload(self, callback: Callable[[dict[str, Any]], None]) -> None:
        self._reload_callbacks.append(callback)

    async def reload(self) -> None:
        await self._load_behavioral_config()
        logger.info("Config reloaded via reload()")

    async def refresh_behavioral_config(self) -> None:
        await self._load_behavioral_config()
        logger.info("Behavioral config refreshed")

    def get(self, key: str, default: Any = None) -> Any:
        return self._behavioral_config.get(key, default)

    def get_symbols(self) -> list[str]:
        val = self.get("symbols", ["BTCUSDT", "ETHUSDT"])
        if isinstance(val, str):
            try:
                return json.loads(val)
            except json.JSONDecodeError:
                if "," in val:
                    return [s.strip() for s in val.split(",")]
                return [val]
        if isinstance(val, list):
            return val
        return ["BTCUSDT", "ETHUSDT"]

    def get_orderbook_levels(self, symbol: str) -> int:
        levels = self.orderbook_levels.copy()
        levels.update(self.get("orderbook_levels", {}))
        return levels.get(symbol, levels.get("default", 20))

    def get_batch_size(self, category: str = "alt_data") -> int:
        sizes = self.runtime.batch_sizes.copy()
        sizes.update(self.get("batch_sizes", {}))
        return sizes.get(category, 50)

    @property
    def redis(self) -> redis.Redis:
        if self._redis is None:
            raise RuntimeError("Redis not connected")
        return self._redis

    async def close(self) -> None:
        from core.database import get_db
        try:
            db = get_db()
            await db.close()
        except RuntimeError:
            pass
        if self._redis:
            await self._redis.close()
        logger.info("Connections closed")


config = Config()


def get_config() -> Config:
    return config