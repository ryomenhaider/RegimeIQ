# VektorLabs — Complete Build Checklist

> Work top to bottom. Do not start a phase until the previous one is fully checked off.
> Each item is one atomic task. Check it only when it works end-to-end, not when code is written.

---

## Phase 0 — Infrastructure & Core

### Docker Compose
- [ ] PostgreSQL (timescale/timescaledb:latest-pg16) running locally
- [ ] Redis (redis:7-alpine) running locally
- [ ] Named volumes for both — data survives container restart
- [ ] `docker compose up -d` starts everything in one command
- [ ] `docker compose ps` shows all services healthy

### Database
- [ ] `vektor` database created
- [ ] TimescaleDB extension enabled (`CREATE EXTENSION IF NOT EXISTS timescaledb`)
- [ ] `001_schema.sql` migration runs without error
- [ ] `002_config.sql` migration runs without error
- [ ] Hypertables created: `microstructure_raw`, `regime_states`, `alt_data_signals`
- [ ] Regular tables created: `users`, `user_settings`, `subscriptions`, `active_symbols`, `system_config`, `llm_insights`
- [ ] Composite indexes on all hypertables: `(symbol, timestamp DESC)`
- [ ] `system_config` table has seed data (tier_assignments, zscore_window, vpin_bucket_size, etc.)

### core/ — Bug Fixes
- [ ] `config.py`: fix `python_dotenv` → `dotenv`
- [ ] `config.py`: fix `self.orderbook_levels` → `self.runtime.orderbook_levels`
- [ ] `circuit_breaker.py`: fix `_on_success` else branch incrementing in CLOSED state
- [ ] `database.py`: fix `run_migrations()` to raise on first failure, not continue
- [ ] `state.py`: fix `predict_proba()` to use `hmm.predict_proba()` not `hmm.predict()`
- [ ] `state.py`: remove `set_hmm_model()` method, use `set_tier_model()` instead
- [ ] `state.py`: move `RegimeOutput` class to `modules/regime/models.py`

### core/ — Verification
- [ ] `config.py`: loads `.env` on import, connects to PostgreSQL, loads system_config into memory
- [ ] `config.py`: `config.get("tier_assignments")` returns correct dict from DB
- [ ] `config.py`: `config.reload()` refreshes config without restart
- [ ] `database.py`: pool initialises, `execute/fetch/fetchrow` all work
- [ ] `redis_bus.py`: `publish()`, `consume()`, `get_latest()` all work
- [ ] `redis_bus.py`: `publish_pubsub()` and `subscribe()` work for control channels
- [ ] `cache.py`: `set/get/delete` with TTL work
- [ ] `circuit_breaker.py`: CLOSED → OPEN → HALF_OPEN → CLOSED cycle works correctly
- [ ] `state.py`: `get_model(symbol)` returns dedicated model if exists, tier fallback otherwise
- [ ] `state.py`: `is_ready()` on OrderBook returns False during resync and before snapshot

### Health Check
- [ ] `GET /api/health` returns 200 with all services connected
- [ ] `GET /api/health/ready` returns 503 when Redis is down

---

## Phase 1 — Ingestion Layer

### ingestion/ingestors/
- [ ] `binance_ws.py`: connects to `wss://fstream.binance.com/ws`
- [ ] `binance_ws.py`: subscribes to `{symbol}@depth20@100ms` and `{symbol}@trade`
- [ ] `binance_ws.py`: exponential backoff reconnection (base=1s, max=60s)
- [ ] `binance_ws.py`: circuit breaker `binance_ws` integrated
- [ ] `binance_ws.py`: resync buffering — buffers on `control:resync:{symbol}` start, flushes on complete
- [ ] `binance_ws.py`: buffer max 500 messages per symbol, drops oldest if exceeded
- [ ] `binance_futures.py`: polls `/fapi/v1/fundingRate` every 60s
- [ ] `binance_futures.py`: polls `/fapi/v1/openInterest` every 60s
- [ ] `binance_futures.py`: WebSocket `{symbol}@forceOrder` for liquidations
- [ ] `binance_futures.py`: circuit breaker `binance_rest` integrated
- [ ] `on_chain.py`: polls `api.blockchain.info/stats` every 10 min
- [ ] `on_chain.py`: polls `mempool.space/api/v1/fees/recommended` every 10 min
- [ ] `on_chain.py`: circuit breaker `blockchain` integrated

### ingestion/extract.py
- [ ] Imports and runs all three ingestors
- [ ] `DataValidator`: checks valid JSON, expected keys, correct types — no domain logic
- [ ] `RedisPublisher`: publishes validated data to correct Redis streams
- [ ] Publishes to `raw:orderbook:{symbol}`, `raw:trades:{symbol}`, `raw:futures:{symbol}`, `raw:onchain`
- [ ] Subscribes to `control:resync:*` and forwards to `binance_ws.py`

### ingestion/transform.py
- [ ] `OrderBookTransformer`: raw dict → `OrderBookSnapshot` dataclass
- [ ] `TradeTransformer`: raw dict → `TradeEvent` dataclass
- [ ] `FuturesTransformer`: raw dict → `FuturesSnapshot` (None fields allowed)
- [ ] `AltDataTransformer`: raw dict → `AltDataPoint` dataclass
- [ ] `ZScoreNormalizer`: in-memory deque per source, window from `config.get("zscore_window", 100)`
- [ ] No Redis I/O in transform.py — pure in-memory computation
- [ ] Stateless except for `ZScoreNormalizer` rolling baseline

### ingestion/load.py
- [ ] `TimescaleLoader`: batch inserts to TimescaleDB every 500ms
- [ ] `RedisLoader`: `xadd` with maxlen on every publish
- [ ] Hot path: Redis publish is synchronous in processing loop
- [ ] TimescaleDB writes: separate background async task, never blocks hot path

### Verification
- [ ] Start system with BTCUSDT
- [ ] `redis-cli xlen raw:orderbook:BTCUSDT` shows growing count
- [ ] `redis-cli xlen raw:trades:BTCUSDT` shows growing count
- [ ] Manually trigger resync — buffer fills, flushes correctly in sequence order
- [ ] Sequence gap detection works — triggers resync on gap

---

## Phase 2 — Microstructure Module

### modules/microstructure/order_book.py
- [ ] `OrderBook`: SortedList bids (descending key), asks (ascending key)
- [ ] `OrderBook._snapshot_received`: False until first REST resync succeeds
- [ ] `OrderBook._resyncing`: True during REST resync, False after
- [ ] `OrderBook.is_ready()`: returns True only when not resyncing, snapshot received, bids/asks non-empty
- [ ] `OrderBook.apply_update()`: removes existing PriceLevel before adding new (no duplicates)
- [ ] Sequence validation: `sequence <= book.sequence` → discard. `sequence > book.sequence + 1` → resync
- [ ] Resync: fetches `fapi/v1/depth?symbol={sym}&limit=1000`, rebuilds book, sets `_snapshot_received=True`
- [ ] `MicrostructureManager`: single Redis XREAD consuming `raw:orderbook:{sym}` and `raw:trades:{sym}`
- [ ] `MicrostructureManager`: no wildcard XREAD — explicit dict of `{stream: last_id}`
- [ ] `MicrostructureManager.add_symbol()`: creates OrderBook + MicrostructureFeatures instances
- [ ] `MicrostructureManager.remove_symbol()`: cleans up all state for symbol
- [ ] Publishes computed metrics to `microstructure:{symbol}`

### modules/microstructure/features.py
- [ ] VPIN: volume-bucket implementation using USDT notional (`price × quantity`)
- [ ] VPIN: bucket size from `config.get_vpin_bucket_size(symbol)`
- [ ] VPIN: `_bucket_vpins` deque maxlen=50
- [ ] CVD: running cumulative since stream start — never reset
- [ ] OFI: all four cases handled (bid↑, bid↓, ask↑, ask↓)
- [ ] `ZScoreNormalizer` used for OFI normalisation

### modules/microstructure/spread.py
- [ ] `SpreadDecomposer`: rolling window of (trade_direction, price_at_trade, timestamp)
- [ ] Outcome check: after N seconds (config), check if price moved in aggressor direction
- [ ] `adverse_selection_pct = informed_count / total_trades_in_window`
- [ ] `adverse_selection_component = adverse_selection_pct × current_spread`
- [ ] Window size W (trades) and outcome delay N (seconds) from config

### modules/microstructure/trade_flow.py
- [ ] `TradeFlowAnalyzer`: Kyle's Lambda via OLS regression
- [ ] `kyle_lambda = cov(delta_price, signed_volume) / var(signed_volume)`
- [ ] Rolling window W trades (default 200 from config)
- [ ] `trade_intensity`: aggressive order count per second, rolling 10s window

### modules/microstructure/models.py
- [ ] `MicrostructureFeatures` dataclass: all computed fields with correct types
- [ ] All fields nullable — never crash if a feature is unavailable

### Verification
- [ ] `redis-cli xread COUNT 1 STREAMS microstructure:BTCUSDT 0-0` returns non-zero values
- [ ] VPIN is between 0 and 1
- [ ] CVD is non-zero and changes with each trade
- [ ] OFI flips sign when sell pressure dominates
- [ ] Kyle Lambda is positive (always)
- [ ] adverse_selection_pct is between 0 and 1

---

## Phase 3 — Regime Module (Developer writes — no AI)

### modules/regime/models.py
- [ ] `RegimeOutput` dataclass moved here from `state.py`
- [ ] Fields: regime, confidence, transition_probs (4x4), time_in_regime, model_tier, model_reliable, timestamp

### modules/regime/features.py
- [ ] `RegimeFeatures`: builds feature vector from `MicrostructureFeatures`
- [ ] volatility: rolling std / mean of mid_price (50 ticks)
- [ ] trend_strength: `|ofi_ma_10| / (bid_pressure + ask_pressure)`
- [ ] liquidity_score: `1 / (kyle_lambda × spread)`
- [ ] Feature normalisation: zero mean, unit variance (statistics from training data)
- [ ] Feature vector shape: (T, 5)

### modules/regime/hmm.py
- [ ] `RegimeModel` wrapper around `GaussianHMM`
- [ ] `n_components=4`, `covariance_type='full'`
- [ ] `predict_proba(features)` uses `hmm.predict_proba()` — NOT `hmm.predict()`
- [ ] `predict_proba()` returns `RegimeOutput` dataclass
- [ ] `is_reliable()` checks `n_observations >= config.get("min_model_observations", 1000)`
- [ ] Model files HMAC-signed — validate signature on load

### modules/regime/trainer.py
- [ ] Fetches 90-day feature matrix from TimescaleDB
- [ ] Runs `GaussianHMM.fit(feature_matrix)`
- [ ] Walk-forward validation: train 60 days, test 30 days, report log-likelihood
- [ ] Saves model file with HMAC signature
- [ ] Called by `scripts/train_hmm.py` only — never by live system

### modules/regime/predictor.py
- [ ] Consumes `microstructure:{symbol}` from Redis
- [ ] Calls `RegimeFeatures.build()` on each message
- [ ] Calls `state.get_model(symbol).predict_proba(features)`
- [ ] Publishes `RegimeOutput` to `regime:{symbol}`
- [ ] Tracks `time_in_regime` — increments while regime unchanged
- [ ] Sets `transition_warning=True` when any transition probability > 0.2

### Verification
- [ ] `redis-cli xread COUNT 1 STREAMS regime:BTCUSDT 0-0` returns data
- [ ] Confidence is between 0 and 1
- [ ] Transition probabilities sum to 1.0
- [ ] Regime changes over time (not stuck in one state)
- [ ] `scripts/train_hmm.py BTCUSDT` completes without error
- [ ] Model file exists and HMAC validates

---

## Phase 4 — Alt Data Module (Developer writes — no AI)

### modules/altdata/ingestors/
- [ ] `reddit.py`: async PRAW, configurable subreddits from user_settings, poll every 5 min
- [ ] `fred.py`: FRED API, series from system_config, poll every 24 hours
- [ ] `google_trends.py`: pytrends, keywords from user_settings, poll every 60 min
- [ ] All ingestors: circuit breaker integrated
- [ ] All ingestors: return raw dicts — no signal logic

### modules/altdata/extractors/
- [ ] `sentiment.py`: sentiment velocity using MAD z-score (not standard z-score)
- [ ] `sentiment.py`: `velocity = (S(t) - S(t-window)) / window`, window=3 periods
- [ ] `spike_detector.py`: robust z-score spike detection, threshold from config (default 2.5)
- [ ] `macro_overlay.py`: risk-on/off from FRED — inverted yield curve + unemployment rising = risk-off

### modules/altdata/confluence.py
- [ ] Consumes `altdata:signals` stream
- [ ] Granger causality test on rolling 30-day window (statsmodels)
- [ ] Lead/lag classification: p-value < 0.05 → LEADING (weight 2x), else LAGGING (weight 0.5x)
- [ ] `signal_s = tanh(velocity_z × direction)`
- [ ] `confluence = sum(w_s × signal_s) / sum(w_s)`
- [ ] Alert flag when `|confluence| >= threshold` AND `≥ 3 sources agree on direction`
- [ ] Publishes to `altdata:confluence`

### modules/altdata/models.py
- [ ] `AltDataSignal` dataclass: source, symbol, value, z_score, velocity_z, lead_lag, direction, timestamp

### Verification
- [ ] `redis-cli xread COUNT 1 STREAMS altdata:signals 0-0` returns data
- [ ] `redis-cli xread COUNT 1 STREAMS altdata:confluence 0-0` returns score between -1 and +1
- [ ] Granger test runs without error on 30-day data
- [ ] Lead/lag classification changes over time (not permanently stuck)
- [ ] Alert triggers when confluence exceeds threshold

---

## Phase 5 — LLM Reasoner (Developer writes — no AI)

### modules/llm_reasoner/fetchers/
- [ ] `sec_edgar.py`: polls EDGAR EFTS API every 15 min for new 8-K, 10-Q
- [ ] `news.py`: polls NewsAPI every 15 min, filters by tracked keywords
- [ ] `transcripts.py`: fetches transcripts on earnings dates
- [ ] All fetchers: circuit breaker integrated
- [ ] All fetchers: return raw text strings

### modules/llm_reasoner/prompts/
- [ ] `causal_extractor.py`: JSON-only system prompt, requires `source_sentence` citation
- [ ] `fed_parser.py`: hawkish/dovish/neutral classification with language_shift field
- [ ] `contradiction.py`: guidance vs numbers comparison prompt

### modules/llm_reasoner/reasoner.py
- [ ] OpenRouter HTTP call via aiohttp
- [ ] Model: `mistralai/mistral-7b-instruct:free`
- [ ] Response parsed as JSON — malformed responses discarded
- [ ] Schema validation on every response
- [ ] `confidence < 0.5` → discard insight
- [ ] Validated assets against known symbol list
- [ ] Publishes `CausalInsight` to `llm:insights`
- [ ] Summary generation: one-sentence market summary every 30s, published to separate Redis key

### modules/llm_reasoner/models.py
- [ ] `CausalInsight` dataclass: all fields typed, all nullable where appropriate

### Verification
- [ ] `redis-cli get llm:summary` returns a sentence
- [ ] `redis-cli xread COUNT 1 STREAMS llm:insights 0-0` returns data on news event
- [ ] Malformed OpenRouter response is silently discarded (no crash)
- [ ] Low-confidence insight is not published

---

## Phase 6 — API Layer

### api/routers/auth.py
- [ ] `POST /auth/register`: creates user, starts trial, returns JWT + sets refresh cookie
- [ ] `POST /auth/login`: authenticates, returns JWT + sets refresh cookie
- [ ] `POST /auth/refresh`: validates refresh cookie, rotates refresh token, returns new JWT
- [ ] `POST /auth/logout`: blacklists JWT jti in Redis (TTL = remaining lifetime)
- [ ] `GET /auth/csrf`: returns CSRF token
- [ ] `POST /auth/forgot-password`: sends reset email
- [ ] `POST /auth/reset-password`: validates token, updates password
- [ ] `GET /auth/check-username`: returns availability (debounced on frontend)
- [ ] Duplicate email/username: same error message for both (no enumeration)
- [ ] Refresh token rotation: using old refresh token after rotation → revoke all user tokens

### api/routers/users.py
- [ ] `GET /users/{username}/settings`: returns full user settings
- [ ] `PATCH /users/{username}/settings`: partial update, validates discord_webhook on save
- [ ] `PATCH /users/{username}/account`: change email or password (requires current password)
- [ ] `DELETE /users/{username}`: requires typing 'DELETE' in confirmation field
- [ ] Authorization: username in JWT must match path param

### api/routers/symbols.py
- [ ] `GET /users/{username}/symbols`: returns active symbol list
- [ ] `POST /users/{username}/symbols`: validates against Binance cache, checks plan limit, spins up stream
- [ ] `DELETE /users/{username}/symbols/{sym}`: removes symbol, decrements subscriber count
- [ ] `GET /symbols/available`: returns cached Binance futures symbol list
- [ ] `GET /symbols/{symbol}/viability`: returns dedicated model eligibility

### api/routers/regime.py, microstructure.py, altdata.py, insights.py
- [ ] All GET current endpoints: served from Redis `get_latest`
- [ ] All history endpoints: served from TimescaleDB with pagination
- [ ] `POST /insights/chat`: RAG context injection, OpenRouter call, SSE streaming
- [ ] `GET /insights/summary`: returns latest summary from Redis

### api/routers/backtest.py
- [ ] `POST /backtest/run`: async job, returns job_id immediately
- [ ] `GET /backtest/{job_id}`: returns status and results when complete

### api/routers/payment.py
- [ ] `POST /payment/create`: creates OxaPay invoice, returns URL
- [ ] `GET /payment/status/{id}`: polls payment status
- [ ] `POST /payment/webhook`: HMAC signature verification, idempotent, updates subscription on Paid
- [ ] Replay attack prevention: reject webhooks with timestamp > 5 min old

### api/routers/admin.py
- [ ] All endpoints require `role=admin` in JWT
- [ ] `PATCH /admin/config`: updates system_config, triggers `config.reload()`
- [ ] `POST /admin/models/retrain`: triggers `scripts/train_hmm.py` for a symbol

### api/routers/health.py
- [ ] `GET /health`: checks all services, returns latency per service
- [ ] `GET /health/live`: 200 always if process running
- [ ] `GET /health/ready`: 503 if PostgreSQL or Redis down

### api/middleware/
- [ ] Request ID middleware: UUID4 per request, in response headers
- [ ] Rate limiting middleware: Redis sliding window, correct limits per endpoint group
- [ ] CORS middleware: `https://vektorlabs.xyz` only, credentials=True
- [ ] Security headers middleware: HSTS, CSP, X-Frame-Options, etc.
- [ ] CSRF validation middleware: validates X-CSRF-Token on mutations
- [ ] Request/response logging middleware: structured JSON, never logs tokens or passwords

### api/services/websocket.py
- [ ] Single WebSocket endpoint at `/ws`
- [ ] Auth within 5 seconds or connection closed
- [ ] Subscribes user to all their active symbols on auth
- [ ] Routes incoming messages: subscribe, unsubscribe, ping
- [ ] Pushes all Redis stream updates to connected clients
- [ ] Heartbeat: expects ping every 60s, closes if none
- [ ] Handles disconnect cleanly, removes from subscriber registry

### Verification
- [ ] All endpoints return correct response envelope
- [ ] JWT expires after 15 minutes — 401 returned
- [ ] Silent token refresh works — client gets new token without redirect
- [ ] Rate limiting returns 429 with Retry-After header
- [ ] CSRF token rejected on mutations without header
- [ ] WebSocket auth fails → connection closed within 5s
- [ ] WebSocket receives regime_update when regime changes

---

## Phase 7 — Frontend

### Setup
- [ ] Vite + React 18 project initialised
- [ ] TailwindCSS configured with custom color tokens
- [ ] IBM Plex Mono and IBM Plex Sans fonts loaded
- [ ] All dependencies installed (react-grid-layout, recharts, zustand, react-query, axios)
- [ ] Environment variables: `VITE_API_URL`, `VITE_WS_URL`

### Auth
- [ ] JWT stored in Zustand `authStore` — never localStorage
- [ ] Refresh token in httpOnly cookie — never accessible via JS
- [ ] `ProtectedRoute`: redirects to /login if no valid token
- [ ] Silent refresh: axios interceptor catches 401, calls `/auth/refresh`, retries original request
- [ ] CSRF token fetched on app mount, stored in memory, sent on all mutations
- [ ] Login form: email + password validation, rate limit error display
- [ ] Register form: username availability check (debounced), password strength indicator

### Dashboard — Structure
- [ ] Route: `/dashboard/:username`
- [ ] Topbar: logo, symbol tabs, live status dot, timestamp, username
- [ ] Summary strip: LLM sentence, typewriter animation on update, updates every 30s
- [ ] Alert strip: hidden when no alerts, slides down on trigger, auto-dismisses 10s
- [ ] Symbol tabs: regime dot per tab, + button to add symbol, drag to reorder
- [ ] Status bar: funding, OI, liquidations, mempool, model info

### Dashboard — Sub-tabs per Symbol
- [ ] Tab 1 Microstructure: OrderBookWidget, MetricsGrid, OFIChart, SpreadDecompWidget
- [ ] Tab 2 Regime: CurrentStateWidget, ProbabilityBars, TransitionMatrix, RegimeHistory, ModelInfo
- [ ] Tab 3 Alt Data: ConfluenceGauge, per-source cards, CorrelationMatrix, LeadLagChart, MacroPanel
- [ ] Tab 4 Causal AI: InsightFeed, ChatInterface, ContextPanel

### Widget Grid
- [ ] react-grid-layout integrated on each sub-tab
- [ ] Layout persisted to `user_settings` on drag-end (debounced 500ms)
- [ ] Default layout loaded from `user_settings` on mount
- [ ] Minimum widget sizes enforced

### WebSocket Hook
- [ ] `useWebSocket`: singleton connection, shared via Zustand
- [ ] Reconnects with exponential backoff on disconnect
- [ ] Message routing: type → correct Zustand store slice → component re-render
- [ ] Heartbeat: ping every 30s, reconnect if no pong in 5s
- [ ] Order book updates throttled with requestAnimationFrame

### Settings Page
- [ ] Route: `/dashboard/:username/settings`
- [ ] Sidebar navigation between sections
- [ ] Each section has its own Save button
- [ ] Unsaved changes indicator per section
- [ ] Symbol management: add/remove, plan limit display, viability warning
- [ ] Discord webhook: test button before save
- [ ] Account: change email/password requires current password
- [ ] Delete account: requires typing 'DELETE'

### Billing Page
- [ ] Current plan display with status badge
- [ ] Plan comparison table
- [ ] OxaPay payment flow: create invoice → open in new tab → poll status
- [ ] Grace period banner persists across all pages
- [ ] Payment history table

### Docs Page
- [ ] Route: `/docs` (public)
- [ ] Markdown rendered from `/docs` directory
- [ ] Left sidebar navigation
- [ ] Ctrl+K client-side search
- [ ] Copy button on code blocks

### Landing Page
- [ ] Navbar: logo + Login + Start Free Trial
- [ ] Hero: headline + two CTAs
- [ ] Live preview widget (read-only, no auth)
- [ ] Three value points
- [ ] Pricing cards
- [ ] Public performance log table
- [ ] Footer

### Verification
- [ ] Lighthouse score: 95+ performance, 100 accessibility on landing page
- [ ] axe-core: zero A and AA violations on all pages
- [ ] Order book updates render within one frame (16ms) of WS message
- [ ] Drag and drop saves layout to settings correctly
- [ ] JWT refresh happens silently — user never redirected unexpectedly
- [ ] All forms keyboard-navigable

---

## Phase 8 — Backtesting

- [ ] `backtest/engine.py`: event-driven simulator — replays TimescaleDB data tick by tick
- [ ] `backtest/simulator.py`: order execution simulation with transaction costs
- [ ] `backtest/metrics.py`: Sharpe ratio, max drawdown, win rate, regime-adjusted Sharpe
- [ ] `backtest/walk_forward.py`: walk-forward validation with configurable windows
- [ ] `POST /backtest/run` async — job queued, results polled
- [ ] Frontend Backtest page renders results with charts

### Verification
- [ ] Backtest on BTCUSDT 90 days completes without error
- [ ] Results include regime breakdown (performance per regime)
- [ ] Sharpe and drawdown values are mathematically correct

---

## Phase 9 — Deployment

### Hetzner VPS
- [ ] Ubuntu 24 server provisioned
- [ ] SSH key auth only — password auth disabled
- [ ] UFW firewall: allow 22, 80, 443 only
- [ ] Docker + Docker Compose installed
- [ ] Repo cloned to `/home/vektor/vektorlabs`

### Nginx
- [ ] `deployment/nginx.conf` configured
- [ ] HTTP → HTTPS redirect
- [ ] `/api/*` and `/ws` proxied to FastAPI
- [ ] Static frontend files served from `dist/`
- [ ] All security headers set (HSTS, CSP, X-Frame-Options, etc.)
- [ ] Rate limiting at Nginx level (100 req/min per IP on API)
- [ ] Gzip compression enabled for text assets

### SSL
- [ ] Certbot installed
- [ ] Certificate issued for `vektorlabs.xyz` and `www.vektorlabs.xyz`
- [ ] Auto-renew cron configured
- [ ] HTTPS verified: `curl -I https://vektorlabs.xyz`

### Production Docker Compose
- [ ] `deployment/docker-compose.yml`: postgres, redis, vektor-core, nginx
- [ ] All services have healthchecks
- [ ] `depends_on` with condition `service_healthy` (not just `service_started`)
- [ ] Environment variables from `.env` (not committed to git)
- [ ] `backup.cron`: nightly PostgreSQL backup, compressed, off-server

### systemd
- [ ] `deployment/vektor.service` installed
- [ ] Service starts on boot: `sudo systemctl enable vektor`
- [ ] `sudo systemctl status vektor` shows active

### CI/CD — GitHub Actions
- [ ] On push to main: run tests → build Docker image → deploy to VPS
- [ ] Frontend: `npm run build` → rsync `dist/` to VPS → Nginx reload
- [ ] Block deploy on test failure
- [ ] Rollback: last 3 builds kept, symlink swap script

### Verification
- [ ] `https://vektorlabs.xyz` loads landing page
- [ ] `https://vektorlabs.xyz/api/v1/health` returns 200
- [ ] User can register, add BTCUSDT, see live regime on dashboard
- [ ] Discord alert fires when confluence threshold crossed
- [ ] HTTPS grade A on SSL Labs

---

## Phase 10 — Pre-Launch

### Performance Log
- [ ] Public performance log populated with at least 30 days of dated regime calls
- [ ] Walk-forward backtest results published on landing page
- [ ] Accuracy metrics computed and displayed

### Pricing & Payment
- [ ] OxaPay account created and webhook configured
- [ ] Trial starts automatically on register (14 days)
- [ ] Upgrade flow tested end-to-end with real crypto payment
- [ ] Grace period triggers correctly on payment failure

### Security Audit
- [ ] `bandit -r .` — zero high-severity findings
- [ ] `npm audit` — zero high-severity findings
- [ ] All secrets in `.env` only — verified not in git history
- [ ] JWT secret is 64+ random bytes
- [ ] Rate limiting tested — 429 fires correctly

### First User Checklist
- [ ] Register on production — no errors
- [ ] Add BTCUSDT — stream starts, regime shows within 10s
- [ ] Dashboard loads with live data
- [ ] Discord webhook alert fires
- [ ] Chat question gets a response
- [ ] Settings save correctly
- [ ] Billing page shows trial status

---

## Ongoing — After Launch

- [ ] Monitor Redis stream lag daily (`redis-cli xlen microstructure:BTCUSDT`)
- [ ] Retrain HMM models every 24 hours (`scripts/train_hmm.py`)
- [ ] Review LLM insight quality weekly — adjust prompts if needed
- [ ] Check Granger causality lead/lag classifications weekly
- [ ] Monitor Binance API changes — stream format can change without notice
- [ ] Review rate limit logs — adjust limits if legitimate users hitting them
- [ ] Update Binance valid symbol list cache when new perpetuals listed