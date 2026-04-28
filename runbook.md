# VektorLabs Local Development

## Quick Start

```bash
# Start infrastructure
docker-compose up -d postgres redis

# Wait for services to be healthy
docker-compose ps

# Run migrations (from host or inside container)
docker-compose exec etl python -c "
import asyncio
from core.database import run_migrations
asyncio.run(run_migrations())
"

# Start ETL pipeline
docker-compose up etl
```

## Services

| Service | Port | Purpose |
|--------|------|---------|
| postgres | 5432 | PostgreSQL + TimescaleDB |
| redis | 6379 | Redis Streams + Cache |
| etl | - | ETL pipeline |

## Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Migrations

SQL migrations are in `storage/migrations/`. They run automatically on first container start from the TimescaleDB init script.

## Connection Pooling

The app uses asyncpg directly. In production with PgBouncer:
- Set `POSTGRES_HOST` to the PgBouncer host
- Configure PgBouncer in transaction mode
- App code is PgBouncer-compatible (no prepared statements)