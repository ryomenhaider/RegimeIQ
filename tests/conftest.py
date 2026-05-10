"""Test fixtures for VektorLabs tests."""

import asyncio
import os

import pytest
import pytest_asyncio

os.environ["ENVIRONMENT"] = "test"
os.environ["POSTGRES_DSN"] = "postgresql://vektor:vektor@localhost:5433/vektor_test"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"

try:
    import fakeredis.aioredis
    FAKE_REDIS_AVAILABLE = True
except ImportError:
    FAKE_REDIS_AVAILABLE = False


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_db():
    """Create test PostgreSQL connection."""
    try:
        import asyncpg
        pool = await asyncpg.create_pool(
            host="localhost",
            port=5433,
            user="vektor",
            password="vektor",
            database="vektor_test",
            min_size=2,
            max_size=10
        )
        
        async with pool.acquire() as conn:
            await conn.execute("DROP TABLE IF EXISTS microstructure_raw CASCADE")
            await conn.execute("DROP TABLE IF EXISTS regime_states CASCADE")
            await conn.execute("DROP TABLE IF EXISTS alt_data_signals CASCADE")
            await conn.execute("DROP TABLE IF EXISTS llm_insights CASCADE")
            await conn.execute("DROP TABLE IF EXISTS system_config CASCADE")
            
            migration_files = [
                "migrations/005_microstructure_raw.sql",
                "migrations/006_regime_states.sql",
                "migrations/007_alt_data_signals.sql",
                "migrations/008_llm_insights.sql",
                "migrations/011_system_config.sql",
            ]
            
            for migration in migration_files:
                try:
                    with open(migration) as f:
                        await conn.execute(f.read())
                except FileNotFoundError:
                    pass
        
        yield pool
        
        await pool.close()
    
    except Exception as e:
        pytest.skip(f"Test DB not available: {e}")


@pytest_asyncio.fixture(scope="function")
async def db(test_db):
    """Provide database connection with transaction rollback."""
    if not test_db:
        pytest.skip("Test DB not available")
    
    async with test_db.acquire() as conn:
        async with conn.transaction():
            yield conn


@pytest_asyncio.fixture
async def fake_redis():
    """Provide fake Redis for unit tests."""
    if not FAKE_REDIS_AVAILABLE:
        pytest.skip("fakeredis not available")
    
    redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield redis
    await redis.flushall()
    await redis.close()


@pytest.fixture
def sample_symbol() -> str:
    """Provide sample symbol."""
    return "BTCUSDT"