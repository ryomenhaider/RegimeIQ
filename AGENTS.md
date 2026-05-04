# VektorLabs Agent Guide

## Quick Start

```bash
# Start infrastructure
docker-compose up -d postgres redis

# Run the full system (requires postgres + redis)
python main.py
```

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `core/` | Config, DB, Redis bus, state management |
| `modules/microstructure/` | OFI, VPIN, Kyle's Lambda, spread models |
| `modules/regime/` | HMM classifier, trainer, predictor |
| `modules/altdata/` | FRED, Reddit, Google Trends, Binance, on-chain |
| `modules/llm_reasoner/` | LLM causal reasoner (OpenRouter) |
| `api/` | FastAPI server |
| `ingestion/` | ETL pipeline (WebSocket + REST) |
| `storage/migrations/` | SQL migrations (PostgreSQL + TimescaleDB) |
| `scripts/` | setup_db.py, train_hmm.py, backfill.py |
| `tests/` | Unit (`tests/unit/`) + integration (`tests/integration/`) |

## Key Commands

```bash
# Database setup (after postgres is running)
python scripts/setup_db.py  # Empty - migrations run automatically via docker-compose

# Train HMM model
python scripts/train_hmm.py --symbol btcusdt --lookback-days 90

# Historical backfill
python scripts/backfill.py --symbol btcusdt --days 30

# Run tests (pytest not configured - conftest.py is empty)
pytest tests/ -v
```

## Configuration

- **Config source**: `.env` file + `system_config` table in PostgreSQL (runtime-loaded)
- **Env vars**: See `.env.example` - requires `POSTGRES_*`, `REDIS_*`, `OPENROUTER_API_KEY`
- **No Makefile targets** - Makefile exists but is empty

## Docker Services

| Service | Host Port | Description |
|---------|-----------|-------------|
| postgres | 5433 | PostgreSQL + TimescaleDB |
| redis | 6379 | Redis Streams + Cache |

## Architecture Notes

- **Entry point**: `main.py` - runs `VektorLabs` async class that starts all modules
- **Async pattern**: Uses `asyncio` throughout, not threading
- **Config loading**: `core/config.py` - singleton `Config` loads from DB on init
- **Models**: HMM models stored in `models/` directory (not committed)
- **No hypertables enabled**: Migration SQL has hypertable creation commented out

## Testing Notes

- Tests use pytest but no `pytest.ini` configured
- `tests/conftest.py` is empty - no fixtures defined
- Run individual tests: `pytest tests/unit/test_regime.py -v`

## Gotchas

- `docker-compose.yml` exposes postgres on port 5433 (not default 5432)
- Migrations auto-run on container init via `storage/migrations/`
- HMM models are optional - system works without them (logs warnings)
- Redis connection required at startup - will fail if Redis unavailable