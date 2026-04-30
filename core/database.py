import logging
from pathlib import Path
from typing import Any, Optional

import asyncpg

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).parent.parent / "storage" / "migrations"


class Database:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def init(
        self,
        dsn: str,
        min_size: int = 5,
        max_size: int = 20,
        timeout: int = 30
    ) -> None:
        self._pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=min_size,
            max_size=max_size,
            command_timeout=timeout,
        )
        logger.info("Database pool initialized")

    async def execute(self, query: str, *args: Any) -> str:
        async with self._pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args: Any) -> list[asyncpg.Record]:
        async with self._pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args: Any) -> Optional[asyncpg.Record]:
        async with self._pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            logger.info("Database pool closed")

    @property
    def pool(self) -> asyncpg.Pool:
        if self._pool is None:
            raise RuntimeError("Database pool not initialized")
        return self._pool


_db: Optional[Database] = None


async def init_db(
    dsn: str,
    min_size: int = 5,
    max_size: int = 20,
    timeout: int = 30
) -> Database:
    global _db
    _db = Database()
    await _db.init(dsn, min_size, max_size, timeout)
    return _db


def get_db() -> Database:
    if _db is None:
        raise RuntimeError("Database not initialized - call init_db() first")
    return _db


async def run_migrations() -> None:
    db = get_db()
    migrations = sorted(MIGRATIONS_DIR.glob("*.sql"))

    async with db.pool.acquire() as conn:
        for migration in migrations:
            logger.info(f"Running migration: {migration.name}")
            sql = migration.read_text()
            await conn.execute(sql)
            logger.info(f"Completed: {migration.name}")


async def setup_database(
    host: str,
    port: int,
    user: str,
    password: str,
    database: str
) -> None:
    dsn = f"postgresql://{user}:{password}@{host}:{port}/{database}"
    try:
        conn = await asyncpg.connect(dsn)
        await conn.close()
    except Exception:
        dsn = f"postgresql://{user}:{password}@{host}:{port}/postgres"
        conn = await asyncpg.connect(dsn)
        await conn.execute(f"CREATE DATABASE {database}")
        await conn.close()
        logger.info(f"Created database: {database}")