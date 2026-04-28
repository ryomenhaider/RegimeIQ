import logging
import os
from pathlib import Path

import asyncpg

from core.config import config

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).parent.parent / "storage" / "migrations"


async def run_migrations() -> None:
    pool = config.pool
    migrations = sorted(MIGRATIONS_DIR.glob("*.sql"))

    async with pool.acquire() as conn:
        for migration in migrations:
            try:
                logger.info(f"Running migration: {migration.name}")
                sql = migration.read_text()
                await conn.execute(sql)
                logger.info(f"Completed: {migration.name}")
            except Exception as e:
                logger.error(f'Migration failed for {migration.name}')

async def setup_database() -> None:
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    user = os.getenv("POSTGRES_USER", "vektor")
    password = os.getenv("POSTGRES_PASSWORD", "vektor")
    database = os.getenv("POSTGRES_DB", "vektor")

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