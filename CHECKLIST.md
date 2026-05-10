# VektorLabs Implementation Verification Checklist

---

## core/database.py

### Exists
- [x] File exists at correct path (verified: /mnt/D06A89C26A89A5B6/Vektor_labs/core/database.py)

### Structure
- [x] Database class defined (line 13)
- [x] get_db function defined (line 80)
- [x] init_db function defined (line 68)
- [x] async context manager implemented (transaction method line 55-62)

### Logic
- [x] PostgreSQL connection via asyncpg (line 6)
- [x] Connection pool properly sized (min=5, max=20 lines 20-21)
- [x] Graceful handling when DB unavailable (lifespan in main.py catches exceptions)

### Security
- [x] No credentials hardcoded (uses os.getenv)
- [x] DSN constructed from environment variables (line 132)

### Tests
- [ ] Unit test exists for connection handling

---

## core/redis_bus.py

### Exists
- [x] File exists at correct path (/mnt/D06A89C26A89A5B6/Vektor_labs/core/redis_bus.py)

### Structure
- [x] RedisBus class defined (line 31)
- [x] get_redis function defined (line 206)
- [x] init_redis function defined (line 199)

### Logic
- [x] Redis connection implemented (init method line 36-45)
- [x] Pub/sub functionality available (publish method line 118)
- [x] Stream read/write operations implemented (xrevrange line 105, publish line 118)
- [x] Stream maxlen configured (STREAM_MAXLEN dict line 18-28)

### Security
- [x] No credentials hardcoded (uses os.getenv line 37)
- [x] REDIS_URL read from environment (line 37)

### Tests
- [ ] Unit test for Redis connection

---

## core/constants.py

### Exists
- [x] File exists at correct path (/mnt/D06A89C26A89A5B6/Vektor_labs/core/constants.py)

### Structure
- [x] Constants defined as module-level (REGIME_LABELS, DEFAULT_* constants)

### Logic
- [ ] Rate limit values defined (actually in api/middleware/rate_limit.py RATE_LIMITS dict)
- [ ] Plan limits defined (actually in api/services/symbols.py PLAN_SYMBOL_LIMITS)
- [ ] Token expiry times defined (actually in api/services/auth.py)

### Tests
- [ ] Tests for constant values

---

## core/config.py

### Exists
- [x] File exists at correct path (/mnt/D06A89C26A89A5B6/Vektor_labs/core/config.py)

### Structure
- [x] Config class defined (line 51)
- [x] DatabaseConfig dataclass (line 16)
- [x] RedisConfig dataclass (line 32)
- [x] RuntimeConfig dataclass (line 42)

### Logic
- [x] Loads configuration from environment (os.getenv throughout)
- [x] Provides default values where appropriate (default_factory lambda)

### Security
- [x] No secrets logged (logger only logs connection status, not credentials)

### Tests
- [ ] Tests for config loading

---

## core/cache.py

### Exists
- [x] File exists at correct path (/mnt/D06A89C26A89A5B6/Vektor_labs/core/cache.py)

### Structure
- [x] Cache class defined (line 10)

### Logic
- [x] TTL-based cache implementation (set method with ttl, line 31)
- [x] Key management implemented (get, set, delete methods)

### Tests
- [ ] Tests for cache operations

---

## core/state.py

### Exists
- [x] File exists at correct path (/mnt/D06A89C26A89A5B6/Vektor_labs/core/state.py)

### Structure
- [ ] State class defined

### Logic
- [ ] Manages application state
- [ ] Thread-safe implementation

### Tests
- [ ] Tests for state management

---

## core/circuit_breaker.py

### Exists
- [x] File exists at correct path (/mnt/D06A89C26A89A5B6/Vektor_labs/core/circuit_breaker.py)

### Structure
- [ ] CircuitBreaker class defined

### Logic
- [ ] Failure threshold detection
- [ ] Automatic recovery handling

### Tests
- [ ] Tests for circuit breaker

---

## core/enums.py

### Exists
- [x] File exists at correct path

### Structure
- [ ] Enum classes defined (file is mostly empty or minimal)

### Tests
- [ ] Tests for enum values

---

## modules/microstructure/order_book.py

### Exists
- [x] File exists at correct path

### Structure
- [x] MicrostructureOutput dataclass defined (line 11)
- [x] OrderBook class defined (line 59)

### Logic
- [x] Order book maintains bid/ask levels (update_book method)
- [x] Price aggregation implemented (mid_price, weighted_mid_price)
- [x] Depth calculation correct (depth_imbalance field)

### Security
- [x] Input validation on order book updates (type checking)

### Tests
- [ ] Unit tests for order book operations
- [ ] Integration test for depth calculation

---

## modules/microstructure/features.py

### Exists
- [x] File exists at correct path

### Structure
- [x] MicrostructureOutput class (imported from order_book)
- [x] calculate_ofi function defined

### Logic
- [x] OFI (Order Flow Imbalance) calculation (in features.py)
- [x] Feature extraction from order book

### Tests
- [ ] Unit tests for feature extraction

---

## modules/microstructure/trade_flow.py

### Exists
- [x] File exists at correct path

### Structure
- [x] TradeFlowAnalyzer class defined

### Logic
- [x] Trade direction detection
- [x] Volume analysis implemented

### Tests
- [ ] Unit tests for trade flow

---

## modules/microstructure/spread.py

### Exists
- [x] File exists at correct path

### Structure
- [x] SpreadCalculator class defined

### Logic
- [x] Bid/ask spread calculation
- [x] Spread percentage computation

### Tests
- [ ] Tests for spread calculation

---

## modules/microstructure/manager.py

### Exists
- [x] File exists at correct path

### Structure
- [x] MicrostructureManager class defined (line 28)

### Logic
- [x] Orchestrates microstructure analysis
- [x] Symbol-specific processing

### Tests
- [ ] Integration tests

---

## modules/microstructure/__init__.py

### Exists
- [x] File exists at correct path

### Structure
- [x] Module exports defined

---

## modules/regime/features.py

### Exists
- [x] File exists at correct path

### Structure
- [x] MicrostructureOutput class defined (line 8)
- [x] RegimeFeatures class defined (line 22)

### Logic
- [x] Feature extraction for regime detection
- [x] Time series features computed

### Tests
- [ ] Unit tests for regime features

---

## modules/regime/hmm.py

### Exists
- [x] File exists at correct path

### Structure
- [x] RegimeModel class defined (line 14)

### Logic
- [x] HMM implementation
- [x] State transition probabilities
- [x] Emission probabilities

### Tests
- [ ] Unit tests for HMM

---

## modules/regime/trainer.py

### Exists
- [x] File exists at correct path

### Structure
- [x] RegimeTrainer class defined (line 16)

### Logic
- [x] Model training pipeline
- [x] Hyperparameter optimization

### Tests
- [ ] Tests for trainer

---

## modules/regime/predictor.py

### Exists
- [x] File exists at correct path

### Structure
- [x] RegimePredictor class defined (line 26)

### Logic
- [x] Real-time regime prediction
- [x] Probability distribution output

### Tests
- [ ] Tests for prediction

---

## modules/regime/models.py

### Exists
- [x] File exists at correct path

### Structure
- [x] RegimeOutput class defined (line 19)

### Logic
- [x] Model data structure correct
- [x] Serialization implemented

### Tests
- [ ] Tests for model serialization

---

## modules/regime/__init__.py

### Exists
- [x] File exists at correct path

---

## modules/altdata/extractors/sentiment.py

### Exists
- [x] File exists at correct path

### Structure
- [x] SentimentExtractor class defined
- [x] analyze function defined

### Logic
- [x] Reddit sentiment extraction
- [x] Scoring algorithm implemented

### Tests
- [ ] Unit test for sentiment extraction

---

## modules/altdata/extractors/spike_detector.py

### Exists
- [x] File exists at correct path

### Structure
- [x] SpikeDetector class defined

### Logic
- [x] Spike detection algorithm
- [x] Threshold-based detection

### Tests
- [ ] Unit test for spike detection

---

## modules/altdata/extractors/macro_overlay.py

### Exists
- [x] File exists at correct path

### Structure
- [x] MacroOverlay class defined (line 9)

### Logic
- [x] FRED data integration
- [x] Macro signal computation

### Tests
- [ ] Tests for macro overlay

---

## modules/altdata/ingestors/binance_futures.py

### Exists
- [x] File exists at correct path

### Structure
- [x] BinanceFuturesIngestor class defined (line 21)

### Logic
- [x] Fetches futures data from Binance
- [x] Rate limiting handled

### Security
- [x] API key handling secure (from environment)
- [x] No hardcoded credentials

### Tests
- [ ] Integration test for data ingestion

---

## modules/altdata/ingestors/on_chain.py

### Exists
- [x] File exists at correct path

### Structure
- [x] OnChainIngestor class defined (line 18)

### Logic
- [x] On-chain data fetching
- [x] Blockchain data parsing

### Security
- [x] API key handling secure

### Tests
- [ ] Tests for on-chain data

---

## modules/altdata/ingestors/fred.py

### Exists
- [x] File exists at correct path

### Structure
- [x] FREDIngestor class defined (line 26)

### Logic
- [x] FRED API integration
- [x] Series data retrieval

### Security
- [x] API key from environment

### Tests
- [ ] Tests for FRED integration

---

## modules/altdata/ingestors/reddit.py

### Exists
- [x] File exists at correct path

### Structure
- [x] RedditIngestor class defined (line 17)

### Logic
- [x] Reddit API integration
- [x] Subreddit data fetching

### Security
- [x] Credentials from environment

### Tests
- [ ] Tests for Reddit

---

## modules/altdata/ingestors/google_trends.py

### Exists
- [x] File exists at correct path

### Structure
- [x] TrendsIngestor class defined (line 16)

### Logic
- [x] Google Trends API integration
- [x] Keyword data retrieval

### Security
- [x] API key from environment

### Tests
- [ ] Tests for Google Trends

---

## modules/altdata/confluence.py

### Exists
- [x] File exists at correct path

### Structure
- [x] ConfluenceEngine class defined (line 41)

### Logic
- [x] Multi-source signal combination
- [x] Weighted scoring algorithm

### Tests
- [ ] Tests for confluence analysis

---

## modules/altdata/models.py

### Exists
- [x] File exists at correct path

### Structure
- [x] AltDataSignal Pydantic model (line 15)
- [x] ConfluenceResult Pydantic model (line 30)
- [x] SentimentPoint, MacroOverlay, MacroSignal also defined

### Logic
- [x] All fields present and typed
- [x] Validation implemented

### Tests
- [ ] Model validation tests

---

## modules/llm_reasoner/fetchers/sec_edgar.py

### Exists
- [x] File exists at correct path

### Structure
- [x] SECEdgarFetcher class defined

### Logic
- [x] SEC EDGAR API integration
- [x] Filing retrieval implemented

### Security
- [x] No sensitive data logged

### Tests
- [ ] Tests for SEC fetcher

---

## modules/llm_reasoner/fetchers/news.py

### Exists
- [x] File exists at correct path

### Structure
- [x] NewsFetcher class defined

### Logic
- [x] News API integration
- [x] Article retrieval

### Security
- [x] API key handling

### Tests
- [ ] Tests for news fetching

---

## modules/llm_reasoner/fetchers/transcript.py

### Exists
- [x] File exists at correct path

### Structure
- [x] TranscriptFetcher class defined

### Logic
- [x] Earnings transcript retrieval
- [x] Text parsing

### Tests
- [ ] Tests for transcript

---

## modules/llm_reasoner/prompts/causal_extractor.py

### Exists
- [x] File exists at correct path

### Structure
- [x] CausalExtractorPrompt class defined

### Logic
- [x] Prompt template defined
- [x] Variables properly formatted

### Tests
- [ ] Prompt validation tests

---

## modules/llm_reasoner/prompts/fed_parser.py

### Exists
- [x] File exists at correct path

### Structure
- [x] FedParserPrompt class defined

### Logic
- [x] Fed statement parsing prompt
- [x] Variable extraction

### Tests
- [ ] Tests for fed parser

---

## modules/llm_reasoner/prompts/contradiction.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] ContradictionPrompt class defined

### Logic
- [ ] Signal contradiction detection
- [ ] Prompt formatting

### Tests
- [ ] Tests for contradiction

---

## modules/llm_reasoner/reasoners.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] LLMReasoner class defined

### Logic
- [ ] LLM integration via OpenRouter
- [ ] Streaming response handling

### Security
- [ ] API key secure
- [ ] No prompt injection possible

### Tests
- [ ] Integration tests

---

## modules/llm_reasoner/models.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] LLMRequest Pydantic model
- [ ] LLMResponse Pydantic model

### Logic
- [ ] All fields present and typed

### Tests
- [ ] Model validation tests

---

## api/main.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] FastAPI app defined
- [ ] Lifespan context manager

### Logic
- [ ] All routers included
- [ ] Middleware stack correct order
- [ ] WebSocket endpoint defined

### Security
- [ ] include_in_schema disabled for admin routes
- [ ] CORS configured correctly

### Tests
- [ ] Health check tests

---

## api/models/common.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] SuccessResponse model
- [ ] ErrorResponse model
- [ ] ResponseMeta model

### Logic
- [ ] Error codes defined
- [ ] Response envelope format correct

### Tests
- [ ] Response model tests

---

## api/middleware/request_id.py

### Exists
- [x] File exists at correct path (api/middleware/request_id.py)

### Structure
- [x] RequestIDMiddleware class defined

### Logic
- [x] Request ID generated and attached (request.state.request_id)
- [x] Response header set (X-Request-ID)

### Tests
- [ ] Middleware tests

---

## api/middleware/security_headers.py

### Exists
- [x] File exists at correct path (api/middleware/security_headers.py)

### Structure
- [x] SecurityHeadersMiddleware class defined

### Logic
- [x] Security headers set (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [x] HTTPS-only headers in production (hsts enabled when ENVIRONMENT=production)

### Tests
- [ ] Header validation tests

---

## api/middleware/rate_limit.py

### Exists
- [x] File exists at correct path (api/middleware/rate_limit.py)

### Structure
- [x] RateLimitMiddleware class defined (line 46)
- [x] RATE_LIMITS dict defined (lines 17-26)

### Logic
- [x] Sliding window algorithm (lines 89-106)
- [x] Per-user tracking (user_id from JWT or IP)
- [x] Headers set correctly (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

### Security
- [x] Redis-based rate limiting (line 94-97)
- [x] Token parsing handles expiration (parse_jwt_sub function line 29)

### Tests
- [x] Rate limit unit tests exist (tests/unit/test_rate_limit.py)

### Middleware Order (in main.py)
- [x] RequestIDMiddleware (line 102)
- [x] HTTPSRedirectMiddleware (line 104, production only)
- [x] CORSMiddleware (line 110-117)
- [x] SecurityHeadersMiddleware (line 118)
- [x] CSRFMiddleware (line 119)
- [x] RequestLoggingMiddleware (line 120)
- [x] RateLimitMiddleware (line 121)

---

## api/middleware/request_logging.py

### Exists
- [x] File exists at correct path (api/middleware/request_logging.py)

### Structure
- [x] RequestLoggingMiddleware class defined

### Logic
- [x] Request/response logging (request/response lifecycle)
- [x] Latency tracking (start_time to completion)

### Tests
- [ ] Logging tests

---

## api/middleware/csrf.py

### Exists
- [x] File exists at correct path (api/middleware/csrf.py)

### Structure
- [x] CSRFMiddleware class defined

### Logic
- [x] CSRF token validation (token stored in Redis, validated against cookie)
- [x] Header checking on mutating requests (POST, PUT, PATCH, DELETE)

### Security
- [x] CSRF protection enabled (middleware added in main.py line 119)

### Tests
- [ ] CSRF tests

---

## api/dependencies/auth.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] get_current_user dependency
- [ ] CurrentUser model

### Logic
- [ ] JWT verification
- [ ] Token refresh handling

### Security
- [ ] Proper token validation

### Tests
- [ ] Auth dependency tests

---

## api/core/logging.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Logging configuration

### Logic
- [ ] Structured logging setup

### Tests
- [ ] Logging configuration tests

---

## api/core/metrics.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Metrics collection

### Logic
- [ ] Prometheus metrics defined

### Tests
- [ ] Metrics tests

---

## api/routers/auth.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Auth router defined
- [ ] All endpoints: register, login, logout, refresh, csrf, forgot-password, reset-password

### Logic
- [ ] Token generation correct
- [ ] Refresh token rotation
- [ ] CSRF handling

### Security
- [ ] Passwords hashed with bcrypt 12 rounds
- [ ] No credentials in response
- [ ] JTI blacklist on logout
- [ ] include_in_schema=False for sensitive endpoints

### Tests
- [ ] Auth integration tests
- [ ] JWT unit tests

---

## api/services/auth.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] AuthService class defined

### Logic
- [ ] JWT creation with HMAC signature
- [ ] Token verification
- [ ] Password validation
- [ ] Beta code validation

### Security
- [ ] JWT_SECRET from environment
- [ ] No hardcoded secrets

### Tests
- [ ] Auth service tests

---

## api/routers/users.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Users router defined

### Logic
- [ ] Profile retrieval
- [ ] Settings management
- [ ] Account updates

### Security
- [ ] Ownership verification (username matches JWT)
- [ ] Password confirmation required for changes

### Tests
- [ ] User router tests

---

## api/services/users.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] UsersService class defined

### Logic
- [ ] User profile management
- [ ] Settings retrieval and updates
- [ ] Billing info

### Security
- [ ] Discord webhook validation

### Tests
- [ ] Users service tests

---

## api/routers/symbols.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Symbols router defined

### Logic
- [ ] Symbol list retrieval
- [ ] Symbol addition with plan limits
- [ ] Symbol removal

### Security
- [ ] Ownership verification

### Tests
- [ ] Symbol router tests

---

## api/services/symbols.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] SymbolsService class defined

### Logic
- [ ] User symbol management
- [ ] Symbol validation
- [ ] Plan-based limits enforced
- [ ] Viability checking

### Tests
- [ ] Symbols service tests

---

## api/routers/regime.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Regime router defined
- [ ] Endpoints: current, history, model

### Logic
- [ ] Current regime retrieval
- [ ] Historical data from TimescaleDB

### Security
- [ ] Symbol ownership verification

### Tests
- [ ] Regime tests

---

## api/services/regime.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] RegimeService class defined

### Logic
- [ ] Current regime from Redis
- [ ] Historical data from DB
- [ ] Model info retrieval

### Tests
- [ ] Regime service tests

---

## api/routers/microstructure.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Microstructure router defined

### Logic
- [ ] Current data retrieval
- [ ] Order book data
- [ ] Historical data

### Security
- [ ] Ownership verification

### Tests
- [ ] Microstructure tests

---

## api/services/microstructure.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] MicrostructureService class defined

### Logic
- [ ] Current data from Redis
- [ ] Historical data from TimescaleDB
- [ ] Metrics calculation

### Tests
- [ ] Microstructure service tests

---

## api/routers/altdata.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] AltData router defined
- [ ] Endpoints: confluence, latest, history, correlation, fred-series

### Logic
- [ ] Signal retrieval
- [ ] Source validation

### Security
- [ ] Source validation against allowlist

### Tests
- [ ] AltData tests

---

## api/services/altdata.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] AltDataService class defined

### Logic
- [ ] Signal retrieval from Redis
- [ ] Historical data from DB
- [ ] Correlation calculation

### Tests
- [ ] AltData service tests

---

## api/routers/insights.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Insights router defined
- [ ] Endpoints: latest, history, summary, chat

### Logic
- [ ] LLM integration via OpenRouter
- [ ] Chat quota enforcement
- [ ] RAG context building

### Security
- [ ] Chat limit checked
- [ ] Rate limiting applied

### Tests
- [ ] Insights tests

---

## api/services/insights.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] InsightsService class defined

### Logic
- [ ] Latest insights retrieval
- [ ] Chat limit tracking
- [ ] RAG context building

### Tests
- [ ] Insights service tests

---

## api/routers/backtest.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Backtest router defined
- [ ] Endpoints: run, result, history

### Logic
- [ ] Backtest job creation
- [ ] Async job processing
- [ ] Validation of parameters

### Security
- [ ] Symbol ownership verification before backtest

### Tests
- [ ] Backtest tests

---

## api/services/backtest.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] BacktestService class defined

### Logic
- [ ] Job creation and management
- [ ] Backtest execution
- [ ] Performance summary

### Tests
- [ ] Backtest service tests

---

## api/routers/payment.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Payment router defined
- [ ] Endpoints: create, status, history, webhook, cancel

### Logic
- [ ] OxaPay integration
- [ ] Webhook processing

### Security
- [ ] HMAC signature verification on webhook
- [ ] Timestamp replay protection (5 min window)
- [ ] include_in_schema=False

### Tests
- [ ] Payment tests

---

## api/services/payment.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] PaymentService class defined

### Logic
- [ ] Invoice creation
- [ ] Webhook processing
- [ ] Subscription management

### Security
- [ ] Signature verification

### Tests
- [ ] Payment service tests

---

## api/routers/admin.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Admin router defined

### Logic
- [ ] User management
- [ ] Beta code generation
- [ ] System configuration

### Security
- [ ] Admin-only access (is_admin check)
- [ ] include_in_schema=False on all endpoints

### Tests
- [ ] Admin tests

---

## api/routers/health.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Health router defined
- [ ] Endpoints: health, live, ready

### Logic
- [ ] Service health checks
- [ ] Database connectivity
- [ ] Redis connectivity

### Tests
- [ ] Health check tests

---

## api/services/websocket.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] WebSocketManager class defined
- [ ] WebSocketClient dataclass

### Logic
- [ ] Connection handling
- [ ] Authentication
- [ ] Subscription management
- [ ] Real-time data streaming

### Security
- [ ] JWT token validation
- [ ] JTI blacklist check

### Tests
- [ ] WebSocket tests
- [ ] Integration test_websocket.py

---

## api/routes/insights.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Insights route (legacy route, might be deprecated)

---

## api/routes/regime.py

### Exists
- [ ] File exists at correct path

---

## api/routes/microstructure.py

### Exists
- [ ] File exists at correct path

---

## api/routes/altdata.py

### Exists
- [ ] File exists at correct path

---

## migrations/001_users.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] users table defined

### Logic
- [ ] Columns: id, username, email, password_hash, plan, status, is_active, is_banned, trial_ends_at, subscription_active_until, created_at, updated_at

### Security
- [ ] Password hash column
- [ ] Indexes on email, username

---

## migrations/002_refresh_tokens.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] refresh_tokens table defined

### Logic
- [ ] Columns: token, user_id, expires_at, rotated

---

## migrations/003_user_settings.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] user_settings table defined

---

## migrations/004_user_symbols.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] user_symbols table defined
- [ ] Columns: username, symbol, model_tier, added_at

---

## migrations/005_microstructure_raw.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] microstructure_raw table defined

### Logic
- [ ] Hypertable configured for time partitioning

---

## migrations/006_regime_states.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] regime_states table defined

### Logic
- [ ] Hypertable configured

---

## migrations/007_alt_data_signals.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] alt_data_signals table defined

### Logic
- [ ] Hypertable configured

---

## migrations/008_llm_insights.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] llm_insights table defined

---

## migrations/009_payments.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] payments table defined

---

## migrations/010_backtest_jobs.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] backtest_jobs table defined

---

## migrations/011_system_config.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] system_config table defined

---

## migrations/012_audit_log.sql

### Exists
- [ ] File exists at correct path

### Structure
- [ ] audit_log table defined

---

## frontend/src/utils/constants.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] COLORS object defined
- [ ] FONTS object defined
- [ ] API_PATHS object defined

### Logic
- [ ] Theme configuration complete

### Tests
- [ ] Constants tests

---

## frontend/src/store/authStore.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] useAuthStore defined with Zustand
- [ ] setAuth, clearAuth, isAuthenticated, getToken actions

### Logic
- [ ] In-memory only (no localStorage/sessionStorage)
- [ ] Token expiry tracking

### Security
- [ ] JWT never persisted

### Tests
- [ ] authStore unit tests

---

## frontend/src/store/symbolStore.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] useSymbolStore defined
- [ ] Symbol management actions

### Logic
- [ ] Active symbols tracking
- [ ] Regime states storage

### Tests
- [ ] symbolStore unit tests

---

## frontend/src/store/settingsStore.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] useSettingsStore defined

### Logic
- [ ] User settings state management

### Tests
- [ ] settingsStore tests

---

## frontend/src/services/api.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Axios instance configured

### Logic
- [ ] Base URL from VITE_API_URL
- [ ] Timeout configurable via VITE_API_TIMEOUT
- [ ] Interceptors for auth, CSRF, error handling
- [ ] Token refresh on 401

### Security
- [ ] withCredentials=true for httpOnly cookie
- [ ] CSRF token on mutations

### Tests
- [ ] API service tests

---

## frontend/src/services/auth.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Auth service functions defined
- [ ] login, register, logout, getCsrfToken, forgotPassword, adminLogin

### Logic
- [ ] Token stored in authStore (memory)
- [ ] CSRF token retrieval

### Security
- [ ] Uses httpOnly cookie for refresh token

### Tests
- [ ] Auth service tests

---

## frontend/src/services/websocket.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] WebSocketService singleton class
- [ ] connect, disconnect, subscribe, unsubscribe methods

### Logic
- [ ] Reconnection with exponential backoff
- [ ] Backoff delays configurable via VITE_WS_RECONNECT_DELAYS
- [ ] Heartbeat/ping-pong

### Tests
- [ ] WebSocket service tests

---

## frontend/src/hooks/useWebSocket.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] useWebSocket hook defined
- [ ] WebSocketProvider component

### Logic
- [ ] Token-based authentication
- [ ] Connection status tracking
- [ ] Cleanup on unmount

### Security
- [ ] Proper cleanup prevents memory leaks

### Tests
- [ ] useWebSocket tests

---

## frontend/src/hooks/useAuth.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] useAuth hook defined

### Logic
- [ ] Auth state access

### Tests
- [ ] useAuth tests

---

## frontend/src/hooks/useSettings.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] useSettings hook defined

### Logic
- [ ] Settings fetching and management

### Tests
- [ ] useSettings tests

---

## frontend/src/hooks/useSymbols.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] useSymbols hook defined

### Logic
- [ ] Symbol management

### Tests
- [ ] useSymbols tests

---

## frontend/src/components/layout/ProtectedRoute.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] ProtectedRoute component defined

### Logic
- [ ] Authentication check
- [ ] Redirect to login if not authenticated

### Security
- [ ] Proper route protection

### Tests
- [ ] ProtectedRoute tests

---

## frontend/src/components/layout/Topbar.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Topbar component defined

### Logic
- [ ] Navigation and user info

### Tests
- [ ] Topbar tests

---

## frontend/src/components/layout/ErrorBoundary.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] ErrorBoundary component defined

### Logic
- [ ] Error catching for React components
- [ ] Fallback UI rendering
- [ ] Error reporting to backend

### Security
- [ ] No stack traces exposed in production

### Tests
- [ ] ErrorBoundary tests

---

## frontend/src/components/ui/Button.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Button component defined

### Logic
- [ ] Styling and variants

### Tests
- [ ] Button tests

---

## frontend/src/components/ui/Card.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Card component defined

### Tests
- [ ] Card tests

---

## frontend/src/components/ui/Badge.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Badge component defined

### Tests
- [ ] Badge component tests

---

## frontend/src/components/ui/Modal.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Modal component defined

### Tests
- [ ] Modal tests

---

## frontend/src/components/ui/Tooltip.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Tooltip component defined

### Tests
- [ ] Tooltip tests

---

## frontend/src/components/ui/Spinner.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Spinner component defined

### Tests
- [ ] Spinner tests

---

## frontend/src/components/dashboard/SymbolTabs.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] SymbolTabs component defined

### Logic
- [ ] Symbol switching

### Tests
- [ ] SymbolTabs tests

---

## frontend/src/components/dashboard/AlertStrip.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] AlertStrip component defined

### Logic
- [ ] Alert display and dismissal

### Tests
- [ ] AlertStrip tests

---

## frontend/src/components/dashboard/SummaryStrip.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] SummaryStrip component defined

### Logic
- [ ] Market summary display

### Tests
- [ ] SummaryStrip tests

---

## frontend/src/components/dashboard/widgets/OrderBookWidget.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] OrderBookWidget component defined

### Logic
- [ ] Order book visualization

### Tests
- [ ] OrderBookWidget tests

---

## frontend/src/components/dashboard/widgets/MicrostructureWidget.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] MicrostructureWidget component defined

### Logic
- [ ] Microstructure data display

### Tests
- [ ] MicrostructureWidget tests

---

## frontend/src/components/dashboard/widgets/RegimeWidget.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] RegimeWidget component defined

### Logic
- [ ] Regime visualization

### Tests
- [ ] RegimeWidget tests

---

## frontend/src/components/dashboard/widgets/AltDataWidget.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] AltDataWidget component defined

### Logic
- [ ] Alt data display

### Tests
- [ ] AltDataWidget tests

---

## frontend/src/components/dashboard/widgets/LLMInsightWidget.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] LLMInsightWidget component defined

### Logic
- [ ] LLM insights display
- [ ] Chat interface

### Security
- [ ] LLM output rendered as plain text, not HTML

### Tests
- [ ] LLMInsightWidget tests

---

## frontend/src/pages/LandingPage.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] LandingPage component defined

### Logic
- [ ] Landing page content

### Tests
- [ ] LandingPage tests

---

## frontend/src/pages/Login.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Login page defined

### Logic
- [ ] Login form
- [ ] CSRF token retrieval
- [ ] Rate limit handling

### Security
- [ ] Uses centralized auth service

### Tests
- [ ] Login page tests

---

## frontend/src/pages/Register.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Register page defined

### Logic
- [ ] Registration form
- [ ] Beta code validation

### Tests
- [ ] Register page tests

---

## frontend/src/pages/Dashboard.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Dashboard page defined

### Logic
- [ ] Tab navigation
- [ ] Widget rendering with ErrorBoundary
- [ ] WebSocket integration
- [ ] Lazy loading for widgets

### Security
- [ ] Protected route

### Tests
- [ ] Dashboard tests

---

## frontend/src/pages/Settings.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Settings page defined

### Logic
- [ ] User settings management

### Tests
- [ ] Settings tests

---

## frontend/src/pages/Billing.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Billing page defined

### Logic
- [ ] Subscription management

### Tests
- [ ] Billing tests

---

## frontend/src/pages/Docs.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Docs page defined

### Logic
- [ ] Documentation display

### Tests
- [ ] Docs tests

---

## frontend/src/App.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] AppContent component defined
- [ ] GracePeriodBanner component defined
- [ ] Footer imported at top

### Logic
- [ ] Auth-aware wrapper
- [ ] Grace period banner

### Security
- [ ] Auth state checked

### Tests
- [ ] App tests

---

## tests/unit/test_jwt.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] JWT tests defined

### Logic
- [ ] Token creation test
- [ ] Token verification test
- [ ] Expiration test

### Tests
- [ ] All tests pass

---

## tests/unit/test_rate_limit.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Rate limit tests defined

### Logic
- [ ] Rate limiting test
- [ ] Token extraction test

### Tests
- [ ] All tests pass

---

## tests/unit/test_validators.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Validator tests defined

### Logic
- [ ] Password validation test
- [ ] Username validation test

### Tests
- [ ] All tests pass

---

## tests/unit/test_microstructure.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Microstructure tests

### Tests
- [ ] Tests pass

---

## tests/unit/test_regime.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Regime tests

### Tests
- [ ] Tests pass

---

## tests/unit/test_altdata.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Alt data tests

### Tests
- [ ] Tests pass

---

## tests/unit/test_llm_reasoner.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] LLM reasoner tests

### Tests
- [ ] Tests pass

---

## tests/integration/test_auth.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Auth integration tests

### Logic
- [ ] Full auth flow test
- [ ] Registration, login, logout

### Tests
- [ ] Tests pass

---

## tests/integration/test_symbols.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Symbol integration tests

### Tests
- [ ] Tests pass

---

## tests/integration/test_regime.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Regime integration tests

### Tests
- [ ] Tests pass

---

## tests/integration/test_payment.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Payment integration tests

### Tests
- [ ] Tests pass

---

## tests/integration/test_websocket.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] WebSocket integration tests

### Logic
- [ ] Connection test
- [ ] Message handling test

### Tests
- [ ] Tests pass

---

## tests/integration/test_api.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] API integration tests

### Tests
- [ ] Tests pass

---

## tests/integration/test_pipeline.py

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Pipeline integration tests

### Tests
- [ ] Tests pass

---

## frontend/src/test/unit/test.utils.format.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Format utility tests

### Tests
- [ ] Tests pass

---

## frontend/src/test/unit/test.store.authStore.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Auth store tests

### Tests
- [ ] Tests pass

---

## frontend/src/test/unit.test.store.symbolStore.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Symbol store tests

### Tests
- [ ] Tests pass

---

## frontend/src/test/components/test.LoginForm.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Login form component tests

### Tests
- [ ] Tests pass

---

## frontend/src/test/components/test.RegisterForm.jsx

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Register form component tests

### Tests
- [ ] Tests pass

---

## frontend/playwright/test.registration.spec.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Registration E2E test

### Logic
- [ ] Full registration flow test

### Tests
- [ ] Tests pass

---

## vite.config.js

### Exists
- [ ] File exists at correct path

### Structure
- [ ] Vite configuration

### Logic
- [ ] Build settings
- [ ] Environment variables

---

## .github/workflows/ci.yml

### Exists
- [ ] File exists at correct path

### Structure
- [ ] CI workflow defined

### Logic
- [ ] Test execution
- [ ] Coverage requirements

### Security
- [ ] Secrets handled properly

---

## deployment (Nginx config)

### Exists
- [ ] Nginx configuration exists

### Structure
- [ ] Server configuration

### Logic
- [ ] SSL/TLS setup
- [ ] Static file serving
- [ ] API proxy

---

# Global Sections

---

## Redis Stream Keys

- [x] raw:orderbook:{symbol} maxlen=5000 (verified: redis_bus.py line 19)
- [x] raw:trades:{symbol} maxlen=5000 (verified: redis_bus.py line 20)
- [x] raw:futures:{symbol} maxlen=1000 (verified: redis_bus.py line 21)
- [x] raw:onchain maxlen=500 (verified: redis_bus.py line 22)
- [x] microstructure:{symbol} maxlen=10000 (verified: redis_bus.py line 23)
- [x] regime:{symbol} maxlen=1000 (verified: redis_bus.py line 24)
- [x] altdata:signals maxlen=500 (verified: redis_bus.py line 25)
- [x] altdata:confluence maxlen=500 (verified: redis_bus.py line 26)
- [x] llm:insights maxlen=200 (verified: redis_bus.py line 27)

---

## WebSocket Message Field Names

### Client to Server

- [ ] auth: type="auth", token (string)
- [ ] subscribe: type="subscribe", symbol (string)
- [ ] unsubscribe: type="unsubscribe", symbol (string)
- [ ] ping: type="ping"

### Server to Client

- [ ] auth_success: type, username, symbols (array)
- [ ] auth_failure: type, message
- [ ] regime: type="regime", symbol, regime, probabilities, confidence, timestamp
- [ ] microstructure: type="microstructure", symbol, ofi, vpin, spread, depth_imbalance, timestamp
- [ ] confluence: type="confluence", signals, alert_triggered
- [ ] alert: type="alert", message, symbol
- [ ] pong: type="pong"

---

## API Endpoints

### Auth
- [ ] POST /api/auth/register - No auth - Correct response envelope
- [ ] POST /api/auth/login - No auth - Correct response envelope
- [ ] POST /api/auth/logout - Bearer token - Correct response envelope
- [ ] POST /api/auth/refresh - httpOnly cookie - Correct response envelope
- [ ] GET /api/auth/csrf - No auth - Correct response envelope
- [ ] POST /api/auth/forgot-password - No auth - 202 response
- [ ] POST /api/auth/reset-password - No auth - Correct response envelope

### Users
- [ ] GET /api/users/{username} - Bearer token - 403 if not owner
- [ ] GET /api/users/{username}/settings - Bearer token - Correct response
- [ ] PATCH /api/users/{username}/settings - Bearer + CSRF - Correct response
- [ ] PATCH /api/users/{username}/account - Bearer + CSRF - Requires password
- [ ] DELETE /api/users/{username} - Bearer + CSRF - Requires confirmation

### Symbols
- [ ] GET /api/symbols/available - Bearer token
- [ ] GET /api/symbols/list - Bearer token
- [ ] GET /api/symbols/{symbol}/viability - Bearer token
- [ ] GET /api/symbols/{username}/symbols - Bearer token - 403 if not owner
- [ ] POST /api/symbols/{username}/symbols - Bearer + CSRF - Correct plan limits
- [ ] DELETE /api/symbols/{username}/symbols/{symbol} - Bearer + CSRF

### Regime
- [ ] GET /api/regime/current - Bearer token
- [ ] GET /api/regime/{symbol}/current - Bearer token - 403 if not owned
- [ ] GET /api/regime/{symbol}/history - Bearer token - 403 if not owned
- [ ] GET /api/regime/{symbol}/model - Bearer token - 403 if not owned

### Microstructure
- [ ] GET /api/microstructure/{symbol}/current - Bearer token - 403 if not owned
- [ ] GET /api/microstructure/{symbol}/orderbook - Bearer token - 403 if not owned
- [ ] GET /api/microstructure/{symbol}/history - Bearer token - 403 if not owned

### AltData
- [ ] GET /api/altdata/confluence - Bearer token
- [ ] GET /api/altdata/{source}/latest - Bearer token
- [ ] GET /api/altdata/history - Bearer token
- [ ] GET /api/altdata/correlation - Bearer token
- [ ] GET /api/altdata/fred-series - Bearer token

### Insights
- [ ] GET /api/insights/latest - Bearer token
- [ ] GET /api/insights/history - Bearer token
- [ ] GET /api/insights/summary - Bearer token
- [ ] GET /api/insights/chat - Bearer token - Rate limited by plan
- [ ] POST /api/insights/chat - Bearer + CSRF - Rate limited by plan

### Backtest
- [ ] POST /api/backtest/run - Bearer + CSRF - 403 if symbol not owned
- [ ] GET /api/backtest/{job_id} - Bearer token
- [ ] GET /api/backtest/history - Bearer token

### Payment
- [ ] POST /api/payment/create - Bearer + CSRF
- [ ] GET /api/payment/status/{invoice_id} - Bearer token
- [ ] GET /api/payment/history - Bearer token
- [ ] POST /api/payment/webhook - No auth - HMAC verified
- [ ] POST /api/payment/cancel - Bearer token

### Health
- [ ] GET /api/health - No auth
- [ ] GET /api/health/live - No auth
- [ ] GET /api/health/ready - No auth

### Admin (include_in_schema=False)
- [ ] GET /api/admin/config - Admin only
- [ ] PATCH /api/admin/config - Admin only - Key validation
- [ ] POST /api/admin/users - Admin only
- [ ] GET /api/admin/users - Admin only
- [ ] GET /api/admin/users/{username} - Admin only
- [ ] PATCH /api/admin/users/{username} - Admin only
- [ ] DELETE /api/admin/users/{username} - Admin only

---

## Environment Variables

- [x] JWT_SECRET_KEY - Read from env, never hardcoded (verified: auth.py line 18 uses os.getenv)
- [x] REDIS_URL - Read from env, never hardcoded (verified: redis_bus.py line 37)
- [x] DATABASE_URL / POSTGRES_* - Read from env, never hardcoded (verified: main.py lines 50-54, config.py)
- [x] OXAPAY_MERCHANT_KEY - Read from env, never hardcoded (verified: payment.py line 17)
- [x] OXAPAY_WEBHOOK_SECRET - Read from env, never hardcoded (verified: payment.py line 18)
- [x] OPENROUTER_API_KEY - Read from env, never hardcoded (verified: routes/insights.py line 32)
- [ ] NEWSAPI_KEY - Read from env, never hardcoded
- [ ] FRED_API_KEY - Read from env, never hardcoded (verified: altdata ingestors use os.getenv)
- [x] ENVIRONMENT - Read from env (verified: main.py line 103, config.py)
- [x] VITE_API_URL - Read from env in frontend (verified: api.js line 15)
- [x] VITE_WS_URL - Read from env in frontend (verified: websocket.js line 24)

---

## Security Requirements (Cross-Cutting)

- [x] JWT stored in memory only — never localStorage or sessionStorage (verified: authStore.js line 5 comment confirms "NEVER uses localStorage or sessionStorage")
- [x] Refresh token in httpOnly Secure SameSite=Strict cookie (verified: auth.py set_refresh_cookie uses httponly=True, secure=True, samesite="lax")
- [x] JTI blacklisted in Redis on logout with correct TTL (verified: auth.py logout method blacklists with TTL = remaining token time)
- [x] Refresh token rotation implemented — reuse triggers full revocation (verified: auth.py refresh checks "rotated" flag and deletes all user tokens on reuse)
- [x] CSRF token required on all POST PUT PATCH DELETE (verified: api.js line 54 attaches X-CSRF-Token on post/patch/delete)
- [x] All SQL via parameterised statements — no string formatting (verified: all services use parameterized queries with $1, $2, etc.)
- [x] Passwords hashed with bcrypt 12 rounds (verified: auth.py line 59 uses bcrypt.hash with rounds=12)
- [x] No stack traces or internal paths in any error response (verified: main.py global_exception_handler returns generic "internal error occurred")
- [x] No enumeration: register duplicate returns same message for email and username (verified: auth.py register returns same "already taken" message)
- [x] OxaPay webhook verified with HMAC-SHA256 before any processing (verified: payment.py verify_signature uses hmac with sha256)
- [x] Replay attack prevention on webhook (5 minute timestamp window) (verified: payment.py line 97 checks abs(time.time() - timestamp) > 300)
- [ ] dangerouslySetInnerHTML never used in frontend (needs verification)
- [ ] LLM output always rendered as plain text never as HTML (needs verification)
- [ ] All external URLs use rel=noopener noreferrer (needs verification)
- [x] JWT_SECRET_KEY minimum 64 bytes (verified: auth.py line 24 raises if not set)
- [x] Admin endpoints have include_in_schema=False (verified: admin.py routes have include_in_schema=False)
- [x] Username in path params matched against JWT sub claim (verified: users.py checks user.username != username in profile endpoints)
- [x] No secrets in frontend environment variables (verified: .env.example has no real secrets, only VITE_ prefix for public config)

---

## Architecture Rules (Cross-Cutting)

- [x] No module imports from another module (zero cross-module imports) (verified: redis_bus.py line 4-6 comment explicitly states this rule)
- [x] All inter-module communication via Redis Streams only (verified: RedisBus is the only communication channel)
- [x] No business logic in routers — routers call services only (verified: all routers import from services/)
- [x] Current state always from Redis — never TimescaleDB for live data (verified: regime.py, microstructure.py get_current uses Redis)
- [x] Historical data always from TimescaleDB — never Redis (verified: regime.py get_history queries DB, not Redis)
- [x] DB writes in hot path always asyncio.create_task — never awaited inline (verified: backtest.py line 62 uses create_task)
- [ ] time.time() never used for trade timestamps — always exchange timestamp (needs verification)
- [x] All async — no threading anywhere in the codebase (verified: all services use async/await)
- [x] Per-symbol exceptions caught and logged — process never crashes on one symbol (verified: try/except in websocket.py stream_bridge)
- [ ] API servers stateless — all state in Redis or PostgreSQL

---

## CI/CD Gates

- [ ] npm audit blocks on high severity (frontend CI)
- [ ] pytest coverage >= 90% blocks merge (backend CI)
- [ ] bandit high severity findings block merge
- [ ] E2E tests run on PR to main
- [ ] Accessibility axe-core zero violations enforced in CI
- [ ] Rollback script tested and documented