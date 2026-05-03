# VektorLabs — AI Context File

> Read this entire file before writing any code, answering any question, or making any architectural decision.
> Everything in this file reflects decisions already made. Do not suggest alternatives unless explicitly asked.

---

## What This System Is

VektorLabs is a real-time market intelligence terminal for semi-professional crypto futures traders managing $50k–$500k. It is not a trading bot. It does not execute trades. It tells traders what kind of market they are in right now and makes every signal regime-aware.

**Core value proposition:** One avoided bad trade covers 50+ months of subscription. That is the pitch.

**Domain:** vektorlabs.xyz
**Pricing:** $47/month (10 symbols) · $97/month (unlimited symbols) · Free trial (3 symbols, 14 days)
**Target customer:** Semi-pro crypto futures traders. They understand microstructure terminology. They have been burned by black-box services. They will pay for something explainable and verifiable.

---

## Repository

```
github.com/ryomenhaider/vektorlabs
```

---

## Project Overview

**Mission:** Real-time microstructure analysis, probabilistic regime detection, alternative data confluence, and LLM-powered causal reasoning — unified in one platform.

**Philosophy:** Most traders lose because they use the right strategy in the wrong market condition. VektorLabs tells you what kind of market you're in, what institutional order flow looks like, what alternative data is signaling, and what news actually means causally.

---

## What the System Produces

| Output | Description | Frequency |
|---|---|---|
| Regime State | Current regime + confidence + transition probability | Per tick |
| OFI / VPIN | Order flow imbalance and toxicity | Per tick |
| Alt Data Signals | Confluence across on-chain, sentiment, macro | 1–60 min |
| LLM Insights | Causal extractions from news, filings, transcripts | On event |
| Alerts | Discord when confluence crosses threshold | On event |
| Summary Line | One-sentence LLM summary of current market state | Every 30s |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Python 3.11+ async |
| API | FastAPI + Uvicorn |
| Regime ML | hmmlearn (GaussianHMM) |
| Time-series DB | TimescaleDB (PostgreSQL extension) |
| Cache / Bus | Redis Streams |
| LLM | OpenRouter — mistralai/mistral-7b-instruct:free |
| Frontend | React — vite |
| Deployment | Hetzner VPS + Docker Compose |
| Package manager | uv |

---

## Architecture

```
External Sources (Binance, FRED, Reddit, NewsAPI, SEC EDGAR, Blockchain.com)
         │
         ▼
Ingestion Layer (Async WebSocket + REST fetchers)
         │
         ▼
Feature Engineering
         │
         ├──► Microstructure Modeler
         ├──► Regime Detector
         ├──► Alternative Data Intelligence
         └──► LLM Financial Reasoner
                         │
                         ▼
               Redis Signal Bus (Streams)
                         │
                         ▼
          FastAPI + WebSocket + React Dashboard
```

---

## Folder Structure

```
vektorlabs/
├── core/
│   ├── config.py              # singleton Config, loads .env + system_config table
│   ├── database.py            # asyncpg pool, execute/fetch/fetchrow
│   ├── redis_bus.py           # publish/consume/get_latest — all modules use this
│   ├── cache.py               # TTL key-value for symbol list, rate limits, tokens
│   ├── circuit_breaker.py     # CLOSED/OPEN/HALF_OPEN per service
│   └── state.py               # AppState, RegimeModel, symbol registry, tier models
│
├── ingestion/
│   ├── extract.py             # connection management, WebSocket + REST sessions
│   ├── transform.py           # raw dict → typed dataclasses, ZScoreNormalizer
│   ├── load.py                # writes to TimescaleDB + Redis Streams
│   └── ingestors/
│       ├── binance_ws.py      # pure transport — L2 order book + trade stream
│       ├── binance_futures.py # pure transport — funding rates, OI, liquidations
│       └── on_chain.py        # pure transport — Blockchain.com, Mempool.space
│
├── modules/
│   ├── microstructure/
│   │   ├── order_book.py      # MicrostructureManager (merged book + features)
│   │   ├── features.py        # OFI, VPIN, CVD, trade intensity, VWAP dev
│   │   ├── spread.py          # Glosten-Milgrom adverse selection decomposition
│   │   ├── trade_flow.py      # Kyle's Lambda, trade intensity
│   │   └── models.py          # MicrostructureFeatures dataclass
│   │
│   ├── regime/
│   │   ├── hmm.py             # GaussianHMM wrapper — DO NOT write for developer
│   │   ├── features.py        # volatility, trend strength, liquidity features
│   │   ├── trainer.py         # offline Baum-Welch training, walk-forward validation
│   │   ├── predictor.py       # real-time posterior inference, publishes to Redis
│   │   └── models.py          # RegimeOutput dataclass — lives here NOT in state.py
│   │
│   ├── altdata/
│   │   ├── ingestors/
│   │   │   ├── reddit.py          # PRAW async — knows which subreddits, why
│   │   │   ├── fred.py            # knows which FRED series matter
│   │   │   ├── google_trends.py   # pytrends — knows which keywords
│   │   │   ├── binance_futures.py # funding, OI, liquidations (free)
│   │   │   └── on_chain.py        # Blockchain.com + Mempool.space
│   │   ├── extractors/
│   │   │   ├── sentiment.py       # velocity not absolute — MAD z-score
│   │   │   ├── spike_detector.py  # 2.5σ above rolling baseline
│   │   │   └── macro_overlay.py   # risk-on vs risk-off from FRED
│   │   ├── confluence.py          # cross-signal correlation, Granger causality
│   │   └── models.py              # AltDataSignal dataclass
│   │
│   └── llm_reasoner/
│       ├── fetchers/
│       │   ├── sec_edgar.py       # 8-K, 10-Q filings
│       │   ├── news.py            # NewsAPI
│       │   └── transcripts.py     # earnings calls
│       ├── prompts/
│       │   ├── causal_extractor.py
│       │   ├── fed_parser.py
│       │   └── contradiction.py
│       ├── reasoner.py            # OpenRouter inference, JSON output only
│       └── models.py              # CausalInsight dataclass
│
├── api/
│   ├── server.py
│   └── routers/
│       ├── auth.py
│       ├── regime.py
│       ├── microstructure.py
│       ├── altdata.py
│       ├── insights.py
│       ├── backtest.py
│       └── admin.py
│
├── frontend/
│   └── Vektor_Labs/           # React + Vite
│       └── src/
│           ├── components/    # per-module widgets
│           ├── pages/
│           │   ├── Dashboard.jsx      # per-symbol tabs
│           │   ├── Login.jsx
│           │   ├── Register.jsx
│           │   └── Settings.jsx
│           └── hooks/
│               ├── useWebSocket.js
│               └── useRegime.js
│
├── backtest/
│   ├── engine.py              # event-driven backtester
│   ├── simulator.py
│   ├── metrics.py             # Sharpe, drawdown, win rate
│   └── walk_forward.py
│
├── storage/
│   └── migrations/
│       ├── 001_schema.sql
│       └── 002_config.sql
│
├── scripts/
│   ├── setup_db.py
│   ├── train_hmm.py           # offline HMM training
│   └── backfill.py
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── deployment/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vektor.service
│   └── backup.cron
│
├── main.py
├── pyproject.toml
├── Makefile
└── README.md
```

---

## Architecture — Non-Negotiable Decisions

**1. Redis Streams as signal bus.**
No module calls another directly. Every module publishes to Redis. Every module consumes from Redis. If you need data from another module, read its Redis stream.

**2. Hot path never touches PostgreSQL.**
The path from WebSocket message to Redis publish has zero DB writes. TimescaleDB writes happen in a separate async background task only.

**3. TimescaleDB for history, Redis for real-time.**
Never mixed. Redis holds the last N events for real-time inference. TimescaleDB holds all history for backtesting and offline model training.

**4. No YAML config files.**
Secrets → `.env` only.
Infrastructure config (DSN, URLs, pool sizes) → `.env`.
Behavioural config (thresholds, windows, polling intervals) → `system_config` PostgreSQL table, loaded into memory at startup, refreshable without restart via `config.reload()`.
User config → `user_settings` table, per-user, isolated.

**5. Circuit breakers on all external connections.**
Use `get_circuit_breaker("service_name")` from `core/circuit_breaker.py`. Configs pre-defined per service — never set thresholds at call sites.

Pre-defined configs:
```
binance_ws:     failures=3, window=30s,  recover=60s
binance_rest:   failures=5, window=60s,  recover=30s
reddit:         failures=3, window=120s, recover=300s
fred:           failures=3, window=300s, recover=600s
openrouter:     failures=5, window=60s,  recover=120s
blockchain:     failures=3, window=120s, recover=300s
```

**6. Ingestion layer separation.**
`ingestion/ingestors/` = pure transport, no domain logic (Binance, on-chain).
`modules/altdata/ingestors/` = domain-aware fetching (Reddit, FRED, Google Trends).

**7. HMM tier model system.**
Three liquidity tiers: HIGH (BTC, ETH), MID (SOL, BNB, XRP), LOW (everything else).
Tier assignments come from `system_config` table — not hardcoded.
If a symbol has 60+ days history and sufficient volume: train dedicated HMM.
Otherwise: fall back to tier model with warning to user.
`state.get_model(symbol)` returns the correct model transparently — callers never know if it's dedicated or tier.

**8. Per-user dashboards.**
Route: `vektorlabs.xyz/dashboard/{username}`
Users configure: symbols (up to plan limit), alert thresholds, Discord webhook, Reddit subreddits, FRED series, Google Trends keywords, layout, timezone.
Users cannot configure: HMM parameters, feature windows, model thresholds, infrastructure settings.

**9. Dynamic symbol subscription.**
User adds symbol → backend checks Binance exchange info (cached in Redis, 1hr TTL) → spins up WebSocket stream without restart → adds to active_symbols registry.
User removes last subscriber of symbol → stream closes → registry cleaned up.

**10. asyncpg Records returned as-is.**
Dict conversion only at API serialization boundary. Never inside database.py.

**11. run_migrations() stops on first failure.**
Never continues past a failed migration. Schema integrity is non-negotiable.

---

## Core Modules

### 1. Ingestion Layer (`ingestion/`)

| File | Purpose |
|------|---------|
| `extract.py` | Binance WebSocket/REST polling, alternative data fetchers |
| `transform.py` | Data validation, normalization, feature calculation |
| `load.py` | Database writes, Redis publishing, cache updates |
| `pipeline.py` | Orchestrates Redis → Transform → Load pipeline |

**Data Flow:**
- `extract.py` publishes raw data to Redis streams: `raw:orderbook:{symbol}`, `raw:trades:{symbol}`, `raw:funding:{symbol}`, `raw:open_interest:{symbol}`, `raw:altdata:{source}`
- `pipeline.py` consumes from streams, transforms, and loads to DB
- **Key pattern:** All inter-module communication via Redis Streams (no direct imports)

### 2. Core Infrastructure (`core/`)

| File | Purpose |
|------|---------|
| `config.py` | Singleton config from .env + PostgreSQL system_config table |
| `database.py` | asyncpg connection pool, migrations, transactions |
| `redis_bus.py` | Redis Streams publish/consume, decode_message helper |
| `cache.py` | Redis cache with TTL, get/set/incr operations |
| `circuit_breaker.py` | State machine CLOSED→OPEN→HALF_OPEN for external dependencies |
| `state.py` | Global AppState with symbol registry, HMM models, service health |

**Key Patterns:**
- Config: `get_config()` singleton, `get_env(key)`, `get_symbols()`, `get_orderbook_levels(symbol)`
- Database: `get_db()` returns connection pool, not the pool itself
- Redis: All data wrapped as `{"data": json.dumps(payload)}`
- Circuit Breaker: per-service state tracking with asyncio event loops

### 3. Microstructure Module (`modules/microstructure/`)

| File | Purpose |
|------|---------|
| `manager.py` | **Main implementation** - OrderBook, MicrostructureFeatures, MicrostructureManager |
| `models.py` | Dataclasses: PriceLevel |
| `spread.py` | (reserved for Glosten-Milgrom decomposition) |
| `trade_flow.py` | (reserved for trade flow features) |

**Key Classes:**
- `OrderBook`: SortedList-based L2 book, sequence validation, REST resync, OFI computation
- `MicrostructureFeatures`: VPIN (volume-bucket), CVD, VWAP, bid/ask pressure
- `MicrostructureManager`: Single Redis consumer for both orderbook+trades, publishes to `microstructure:{symbol}`

**OrderBook State Machine:**
1. `_snapshot_received = False` (initial)
2. After first valid update or resync → `_snapshot_received = True`
3. `is_ready()` returns True when: `_resyncing=False` AND `_snapshot_received=True` AND bids+asks populated

### 4. Regime Detector (`modules/regime/`)

| File | Purpose |
|------|---------|
| `hmm.py` | Hidden Markov Model implementation |
| `trainer.py` | HMM training from historical data |
| `predictor.py` | Real-time regime classification |
| `features.py` | Feature extraction for regime model |
| `models.py` | Regime dataclasses |

**4 Regimes:** Trending, Mean-Reverting, Volatile, Illiquid

### 5. Alternative Data (`modules/altdata/`)

| File | Purpose |
|------|---------|
| `ingestors/` | Binance futures, FRED macro, Google Trends, On-chain, Reddit |
| `extractors/` | Macro overlay, sentiment, spike detection |
| `confluence.py` | Cross-signal correlation, lead/lag classifier |

### 6. LLM Reasoner (`modules/llm_reasoner/`)

| File | Purpose |
|------|---------|
| `fetchers/` | News, SEC EDGAR, earnings transcripts |
| `prompts/` | Causal extraction, contradiction detection, Fed parsing |
| `reasoners.py` | LLM orchestration |

### 7. Backtest (`backtest/`)

| File | Purpose |
|------|---------|
| `engine.py` | Backtest engine |
| `simulator.py` | Trade simulation |
| `metrics.py` | Performance metrics |
| `walk_forward.py` | Walk-forward analysis |

---

## Data Flow Summary

```
Binance WebSocket/REST
    ↓
extract.py → Redis: raw:orderbook:{symbol}, raw:trades:{symbol}
    ↓
pipeline.py (consumes streams) → transform.py → load.py
    ↓                              ↓                    ↓
                          TimescaleDB           Redis: microstructure:{symbol}
                                                   ↓
                                            MicrostructureManager
                                                   ↓
                                            Redis: computed metrics
```

---

## Redis Stream Keys

| Stream | Publisher | maxlen | Consumers |
|---|---|---|---|
| `raw:orderbook:{symbol}` | ingestion/extract.py | 5000 | MicrostructureManager |
| `raw:trades:{symbol}` | ingestion/extract.py | 5000 | MicrostructureManager |
| `microstructure:{symbol}` | MicrostructureManager | 10000 | Regime predictor, Dashboard |
| `regime:{symbol}` | Regime predictor | 1000 | Confluence engine, Dashboard |
| `altdata:signals` | Altdata module | 500 | Confluence engine, Dashboard |
| `altdata:confluence` | Confluence engine | 500 | Dashboard, Alert system |
| `llm:insights` | LLM reasoner | 200 | Dashboard |

---

## Data Sources (All Free)

| Source | Data | Endpoint |
|---|---|---|
| Binance WebSocket | L2 order book, trades | fstream.binance.com |
| Binance REST Futures | Funding, OI, liquidations | fapi.binance.com/fapi/v1 |
| FRED API | CPI, yield curve, unemployment | fred.stlouisfed.org |
| Reddit PRAW | Subreddit posts + scores | praw.readthedocs.io |
| Google Trends | Search volume | pytrends library |
| Blockchain.com | On-chain volume, exchange flows | api.blockchain.info |
| Mempool.space | BTC mempool, fees | mempool.space/api |
| SEC EDGAR | 8-K, 10-Q filings | efts.sec.gov |
| NewsAPI | Headlines | newsapi.org |
| OpenRouter | LLM inference | openrouter.ai |

---

## Database Schema

### Hypertables (TimescaleDB — partitioned by time, 1-day intervals)

```sql
microstructure_raw   — symbol, timestamp, bid_ask_imbalance, mid_price, bids_json, asks_json
regime_states        — symbol, timestamp, regime, confidence, transition_probs, time_in_regime
alt_data_signals     — source, symbol, value, z_score, timestamp, raw_json
```

### Regular Tables (PostgreSQL)

```sql
llm_insights     — source, causal_summary, confidence, affected_assets, time_horizon, timestamp
users            — id, username, email, password_hash, plan, created_at
user_settings    — user_id, symbols TEXT[], alert_threshold, discord_webhook, reddit_subs,
                   fred_series, trends_keywords, layout_json, timezone
subscriptions    — user_id, plan, status, started_at, expires_at
active_symbols   — symbol, subscriber_count, stream_active
system_config    — key, value (all behavioural config lives here)
```

### Indexes

Every hypertable has composite index on `(symbol, timestamp DESC)`.

---

## core/ Files — Status and Known Bugs

### config.py
Singleton Config class. Loads `.env` at import. Connects to PostgreSQL and loads `system_config` table into memory at startup. Exposes `get(key, default)`, `reload()`, `on_reload(callback)`.

**Known bugs:**
- Line 6: `from python_dotenv import load_dotenv` → should be `from dotenv import load_dotenv`
- `get_orderbook_levels()` references `self.orderbook_levels` → should be `self.runtime.orderbook_levels`

### database.py
asyncpg connection pool. Exposes `execute()`, `fetch()`, `fetchrow()`. Returns raw asyncpg Records.

**Known bug:**
- `run_migrations()` catches exceptions and continues → must raise on first failure

### redis_bus.py
Wraps all Redis Stream operations. `publish(stream, data, maxlen)`, `consume(stream, last_id, count)`, `get_latest(stream)`. Clean — no bugs.

### cache.py
TTL key-value operations. `set(key, value, ttl)`, `get(key)`, `delete(key)`. Used for Binance symbol list cache, rate limit counters, session tokens. Clean — no bugs.

### circuit_breaker.py
Three-state machine per service. Prometheus metrics included.

**Known bug:**
- `_on_success()` else branch increments `_half_open_calls` when state is CLOSED — should only increment in HALF_OPEN state

### state.py
AppState class with symbol task registry, model registry, tier models, service health flags.

**Known bugs:**
- `RegimeModel.predict_proba()` uses `hmm.predict()` (Viterbi — hard assignment) instead of `hmm.predict_proba()` (posterior probabilities). Confidence scores require predict_proba.
- `set_hmm_model()` hardcodes `n_observations=0` → `is_reliable()` always returns False. Remove this method, use `set_tier_model()` instead.
- `RegimeOutput` class defined in state.py → should be in `modules/regime/models.py`

---

## modules/ Build Status

### microstructure/ — IN PROGRESS

`manager.py` contains `MicrostructureManager` (merged order book + features into single Redis consumer). Key implementation details:

**OrderBook class:**
- `SortedList` with `key=lambda x: -x.price` for bids (descending), `key=lambda x: x.price` for asks (ascending)
- `_snapshot_received: bool` — set True only after first full REST resync, not on delta updates
- `_resyncing: bool` — True during REST resync
- `is_ready()` checks all three: `not _resyncing AND _snapshot_received AND len(bids) > 0 AND len(asks) > 0`
- Sequence validation: `sequence <= book.sequence` → discard silently. `sequence > book.sequence + 1` → resync.
- `apply_update()` removes existing PriceLevel at price before adding new one (avoids duplicates in SortedList)

**MicrostructureFeatures class:**
- VPIN uses volume buckets in USDT notional (`price × quantity`), not time windows. Bucket size from `config.get_vpin_bucket_size(symbol)`.
- CVD is running cumulative since stream start — never reset
- ZScore baseline is in-memory deque per source — no Redis I/O

**MicrostructureManager:**
- Single Redis consumer reading `raw:orderbook:{symbol}` and `raw:trades:{symbol}` simultaneously via XREAD with dict of stream→last_id
- Publishes to `microstructure:{symbol}`
- Resync fetches from `https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=1000`

**Computed metrics published:** spread, mid_price, weighted_mid_price, depth_imbalance, ofi, vpin, cvd, top_bid, top_ask, vwap_deviation, bid_pressure, ask_pressure

**Completed:** spread.py (Glosten-Milgrom), trade_flow.py (Kyle's Lambda)

### regime/ — NOT STARTED
Developer writes this themselves. Do not implement. Only explain concepts and guide.

### altdata/ — NOT STARTED

### llm_reasoner/ — NOT STARTED

---

## Frontend Architecture

**Layout:** Symbol tabs at top. Each symbol has 4 tabs:
1. Microstructure — OFI, VPIN, Kyle's Lambda, spread decomposition, order book heatmap
2. Regime — current state, probability bars, transition matrix, time in regime
3. Alt Data Intelligence — dashboard inside dashboard with per-source scores, confluence bar, macro overlay
4. Causal AI — RAG chat, LLM insights panel, causal chain explorer

**Summary line:** Single line above symbol tabs. LLM-generated, updates every 30 seconds. One sentence summarising exactly what is happening right now across all active symbols.

**Alert strip:** Between summary line and symbol tabs. Flashes on regime transition (confidence > 0.75) or confluence threshold breach.

**Per-symbol settings:** Settings icon on each symbol tab. Configures thresholds for that symbol without leaving the view.

**WebSocket:** Single connection per user. Subscribes to all their active symbols. Message types: `regime_update`, `microstructure_update`, `altdata_signal`, `llm_insight`, `alert`, `summary_update`.

**Causal AI chat:** SSE or separate WebSocket. User question → backend → OpenRouter with last N microstructure + regime + altdata snapshots as RAG context.

**Drag library:** react-grid-layout for modular widget arrangement.

---

## HMM Implementation Notes

Developer writes hmm.py themselves. Do not implement. When asked to explain:

- `GaussianHMM` from hmmlearn, `n_components=4`, `covariance_type="full"`
- Four states: trending (0), mean_reverting (1), volatile (2), illiquid (3)
- Training: Baum-Welch algorithm via `fit()`. Needs sufficient observations to converge — minimum configured in `system_config` as `min_model_observations` (default 1000)
- Inference: use `predict_proba()` not `predict()`. predict() returns Viterbi hard assignment — no confidence. predict_proba() returns posterior probability matrix — required for confidence scores.
- Training runs offline via `scripts/train_hmm.py` on 90-day rolling window from TimescaleDB
- Retrain every 24 hours. Model files HMAC-signed for integrity verification.

---

## Glosten-Milgrom — What to Implement

Only three things matter for spread.py:

1. The spread has two components: adverse selection (informed traders) and inventory cost.
2. Adverse selection component = fraction of spread that gets "realized" — price moves in direction of trade after execution.
3. Empirical estimation: rolling window of trades, for each trade check if price moved in aggressor direction within N seconds, fraction that did × spread = adverse selection component.

Everything else in the paper is theoretical scaffolding. Do not implement the full model — only the adverse selection component estimator.

---

## Startup Sequence (Mandatory Order)

Any failure before step 8 must crash loudly — never start ingesting data with broken config.

1. Load environment variables from `.env`
2. Establish PostgreSQL connection pool
3. Establish Redis connection
4. Load `system_config` table into memory
5. Run pending migrations (stop on first failure)
6. Validate Binance symbol list — cache in Redis with 1hr TTL
7. Load trained HMM models from disk — validate HMAC signatures
8. Start all extractors and intelligence modules

---

## Build Order

| Phase | Build | Done When |
|---|---|---|
| 0 | Docker Compose, PostgreSQL, Redis, core/ | Health check passes, system_config loads |
| 1 | ingestion/ — extract, transform, load, ingestors | Redis Stream raw:orderbook:btcusdt has live data |
| 2 | modules/microstructure/ — all files | Features update on every tick, values non-zero |
| 3 | modules/regime/ — HMM trainer + predictor | Regime publishes to Redis with confidence > 0 |
| 4 | modules/altdata/ — all ingestors + extractors + confluence | Confluence score publishes every minute |
| 5 | modules/llm_reasoner/ | LLM insights publish on news events |
| 6 | api/ — FastAPI + WebSocket + auth + user settings | All endpoints return correct data |
| 7 | frontend/ — React dashboard | Dashboard live at localhost:3000 |
| 8 | backtest/ | Returns regime-adjusted Sharpe and win rate |
| 9 | Deployment — Hetzner, Nginx, SSL, CI/CD | vektorlabs.xyz live, first user can register |

**Current phase: Phase 2 — microstructure/ in progress. spread.py and trade_flow.py not yet implemented.**

---

## What Developer Writes Themselves (Do Not Implement)

- `modules/regime/` — all files
- `modules/microstructure/spread.py` — Glosten-Milgrom
- `modules/microstructure/trade_flow.py` — Kyle's Lambda
- `modules/altdata/` — all files
- `modules/llm_reasoner/` — all files

For these files: explain concepts, point to correct math, catch bugs in their implementation. Never write the implementation.

---

## What AI Can Write

- `core/` files (already written, bugs documented above)
- `ingestion/` files
- `modules/microstructure/` files (except spread.py, trade_flow.py)
- `api/` files
- `frontend/` files
- `backtest/` files
- `storage/migrations/` SQL files
- `deployment/` files
- `scripts/` files

---

## Configuration

**Environment Variables (.env):**
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `BINANCE_WS_ENDPOINT`, `BINANCE_REST_ENDPOINT`

**Runtime Config (core/config.py):**
- `get_symbols()`: List of trading symbols
- `get_orderbook_levels(symbol)`: Order book depth per symbol
- `get_vpin_bucket_size(symbol)`: VPIN volume bucket size in USDT
- `get_batch_size(category)`: Bulk operation batch sizes

---

## Important Patterns

### 1. No Direct Module Imports
All communication via Redis Streams. If module A needs data from module B, it subscribes to the appropriate stream, not imports B.

### 2. Async-First
All I/O is async (asyncio, aiohttp, asyncpg, redis.asyncio). No blocking calls in hot paths.

### 3. Singleton Patterns
- `Config` - singleton from .env + DB
- `Database` - singleton pool manager
- `RedisBus` - singleton connection

### 4. Circuit Breaker
All external dependencies (Binance API, FRED, etc.) wrapped with circuit breaker to prevent cascading failures.

### 5. Sequence Validation
Order book updates validated by sequence number. Gaps trigger REST resync.

### 6. Book Ready State
Features only computed when order book is ready:
```python
is_ready() = not _resyncing and _snapshot_received and bids>0 and asks>0
```

---

## Key Redis Streams

| Stream | Producer | Consumer | Payload |
|--------|----------|----------|---------|
| `raw:orderbook:{symbol}` | extract.py | MicrostructureManager | bids, asks, sequence |
| `raw:trades:{symbol}` | extract.py | MicrostructureManager | price, qty, side, timestamp |
| `raw:funding:{symbol}` | extract.py | pipeline.py | funding_rate, funding_time |
| `raw:open_interest:{symbol}` | extract.py | pipeline.py | open_interest, timestamp |
| `raw:altdata:{source}` | extract.py | pipeline.py | source-specific payload |
| `microstructure:{symbol}` | MicrostructureManager | downstream | computed metrics |

---

## Database Tables (TimescaleDB)

- `microstructure_raw` - raw orderbook and trade data
- `funding_rates` - funding rate history
- `open_interest` - OI history
- `regime_events` - regime transitions
- `altdata` - alternative data points

---

## Dependencies

- Python 3.11+
- asyncpg - PostgreSQL async
- redis.asyncio - Redis async
- aiohttp - HTTP client
- websockets - WebSocket client
- sortedcontainers - Efficient sorted collections
- pydantic - Data validation
- prometheus_client - Metrics

---

## Testing

- `tests/unit/` - Unit tests per module
- `tests/integration/` - Integration tests for pipelines

---

## Key Principles — Always Apply

- Async everywhere. No blocking calls in hot path.
- Validate all external data at extract boundary. Never trust exchange data.
- Timestamps always UTC, always microsecond precision, always from exchange.
- Structured JSON logs via loguru. No print statements. Log at boundaries only.
- Idempotent DB writes — upsert logic, not blind inserts.
- Never delete financial data — archive or mark stale.
- Redis Stream maxlen on every XADD call — without it streams grow unbounded.
- One blocking call in async event loop stalls the entire pipeline.
- Config changes must never require a restart — reload() handles it.
- Schema changes via migrations only — never raw ALTER TABLE in application code.

---

## Development Notes

1. When adding new features, follow the Redis Streams pattern
2. Always use async/await, never blocking I/O
3. Add circuit breaker for new external dependencies
4. Keep dataclasses in `models.py`, not scattered in implementations
5. Single source of truth for configuration in `config.py`
6. Book readiness must be checked before computing features

---

## Developer Context

19-year-old self-taught developer, solo founder, based in Lahore Pakistan. Writes code daily. Understands what code does when explained. Currently reading Wasserman (All of Statistics) and Hyndman (Forecasting). Studying Glosten-Milgrom, Kyle 1985, Easley VPIN paper, and Rabiner HMM tutorial alongside building.

Preferred working style: direct answers, no lectures, no motivation. Point at bugs specifically. When explaining concepts connect them directly to the system being built. Challenge understanding by asking to explain back.

Uses AI to write infrastructure and boilerplate. Writes intelligence module implementations himself. This is the correct split — do not try to write the regime/altdata/llm modules.