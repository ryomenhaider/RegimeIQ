"""Test fixtures for VektorLabs API tests."""

import asyncio
import os
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test-secret"
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
            await conn.execute("DROP TABLE IF EXISTS users CASCADE")
            await conn.execute("DROP TABLE IF EXISTS refresh_tokens CASCADE")
            await conn.execute("DROP TABLE IF EXISTS user_settings CASCADE")
            await conn.execute("DROP TABLE IF EXISTS user_symbols CASCADE")
            await conn.execute("DROP TABLE IF EXISTS symbol_subscriptions CASCADE")
            await conn.execute("DROP TABLE IF EXISTS microstructure_raw CASCADE")
            await conn.execute("DROP TABLE IF EXISTS regime_states CASCADE")
            await conn.execute("DROP TABLE IF EXISTS alt_data_signals CASCADE")
            await conn.execute("DROP TABLE IF EXISTS llm_insights CASCADE")
            await conn.execute("DROP TABLE IF EXISTS payments CASCADE")
            await conn.execute("DROP TABLE IF EXISTS backtest_jobs CASCADE")
            await conn.execute("DROP TABLE IF EXISTS system_config CASCADE")
            await conn.execute("DROP TABLE IF EXISTS audit_log CASCADE")
            
            migration_files = [
                "migrations/001_users.sql",
                "migrations/002_refresh_tokens.sql",
                "migrations/003_user_settings.sql",
                "migrations/004_user_symbols.sql",
                "migrations/005_microstructure_raw.sql",
                "migrations/006_regime_states.sql",
                "migrations/007_alt_data_signals.sql",
                "migrations/008_llm_insights.sql",
                "migrations/009_payments.sql",
                "migrations/010_backtest_jobs.sql",
                "migrations/011_system_config.sql",
                "migrations/012_audit_log.sql",
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


@pytest_asyncio.fixture(scope="function")
async def client(db, fake_redis) -> AsyncGenerator[AsyncClient, None]:
    """Provide test HTTP client with dependency overrides."""
    from api.main import app
    from core.database import Database
    from core.redis_bus import RedisBus
    
    class TestDatabase:
        def __init__(self, pool):
            self.pool = pool
    
    class TestRedis:
        def __init__(self, redis):
            self.redis = redis
        
        def get(self, key):
            return asyncio.get_event_loop().run_until_complete(self._get(key))
        
        async def _get(self, key):
            return await self.redis.get(key)
        
        def setex(self, key, ttl, value):
            return asyncio.get_event_loop().run_until_complete(self._setex(key, ttl, value))
        
        async def _setex(self, key, ttl, value):
            return await self.redis.setex(key, ttl, value)
        
        def xlen(self, key):
            return asyncio.get_event_loop().run_until_complete(self._xlen(key))
        
        async def _xlen(self, key):
            return await self.redis.xlen(key)
        
        def publish(self, channel, message):
            pass
        
        def incr(self, key):
            return asyncio.get_event_loop().run_until_complete(self._incr(key))
        
        async def _incr(self, key):
            return await self.redis.incr(key)
        
        def expire(self, key, ttl):
            return asyncio.get_event_loop().run_until_complete(self._expire(key, ttl))
        
        async def _expire(self, key, ttl):
            return await self.redis.expire(key, ttl)
        
        def delete(self, *keys):
            return asyncio.get_event_loop().run_until_complete(self._delete(*keys))
        
        async def _delete(self, *keys):
            return await self.redis.delete(*keys)
        
        def info(self, section=None):
            return {"used_memory": 0}
        
        def xrevrange(self, stream, count=None, *args, **kwargs):
            return []
        
        def xread(self, streams, count=None, block=None):
            return []
    
    app.state.db = TestDatabase(db) if db else None
    app.state.redis = TestRedis(fake_redis) if fake_redis else None
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    
    app.state.db = None
    app.state.redis = None


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, db) -> dict:
    """Provide authentication headers for test user."""
    if not db:
        pytest.skip("DB not available")
    
    username = f"testuser_{uuid.uuid4().hex[:8]}"
    email = f"{username}@test.com"
    password = "TestPass123"
    
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    if response.status_code == 201:
        return {"Authorization": f"Bearer {response.json()['data']['access_token']}"}
    
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password}
    )
    
    if login_response.status_code == 200:
        return {"Authorization": f"Bearer {login_response.json()['data']['access_token']}"}
    
    pytest.skip("Auth not available")


@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient, db) -> dict:
    """Provide authentication headers for admin user."""
    if not db:
        pytest.skip("DB not available")
    
    username = f"admin_{uuid.uuid4().hex[:8]}"
    email = f"{username}@test.com"
    password = "AdminPass123"
    
    async with db.transaction():
        await db.execute(
            """INSERT INTO users (username, email, password_hash, plan, is_admin)
               VALUES ($1, $2, $3, 'admin', true)""",
            username, email, "fake_hash"
        )
    
    token_response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password}
    )
    
    if token_response.status_code == 200:
        return {"Authorization": f"Bearer {token_response.json()['data']['access_token']}"}
    
    return {}


@pytest.fixture
def sample_user() -> dict:
    """Provide sample user data."""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "TestPass123"
    }


@pytest.fixture
def sample_symbol() -> str:
    """Provide sample symbol."""
    return "BTCUSDT"