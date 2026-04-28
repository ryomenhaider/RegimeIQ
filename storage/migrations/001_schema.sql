BEGIN;

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    watched_symbols TEXT[] NOT NULL DEFAULT ARRAY['BTCUSDT', 'ETHUSDT'],
    alert_webhook_url TEXT,
    display_timezone TEXT NOT NULL DEFAULT 'UTC',
    subreddits TEXT[] NOT NULL DEFAULT ARRAY['cryptocurrency', 'bitcoin'],
    trends_keywords TEXT[] NOT NULL DEFAULT ARRAY['bitcoin', 'ethereum'],
    fred_series TEXT[] NOT NULL DEFAULT ARRAY['CPIAUCSL', 'UNRATE'],
    dashboard_layout JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'pro')),
    stripe_subscription_id TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE microstructure_raw (
    id BIGSERIAL,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    price NUMERIC(20, 8) NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    order_id TEXT,
    level INTEGER,
    ofi NUMERIC(20, 8),
    cumulative_quantity NUMERIC(20, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('microstructure_raw', 'timestamp',
    if_exists => TRUE,
    migrate_data => TRUE,
    chunk_interval => INTERVAL '1 day'
);

CREATE TABLE regime_states (
    id BIGSERIAL,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    regime TEXT NOT NULL CHECK (regime IN ('trending', 'mean_reverting', 'volatile', 'illiquid')),
    confidence NUMERIC(5, 4) NOT NULL,
    transition_probs JSONB NOT NULL,
    vpin NUMERIC(10, 8),
    kyle_lambda NUMERIC(20, 8),
    spread NUMERIC(20, 8),
    depth_imbalance NUMERIC(10, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('regime_states', 'timestamp',
    if_exists => TRUE,
    migrate_data => TRUE,
    chunk_interval => INTERVAL '1 day'
);

CREATE TABLE alt_data_signals (
    id BIGSERIAL,
    symbol TEXT,
    source TEXT NOT NULL CHECK (source IN ('fred', 'reddit', 'google_trends', 'binance_futures', 'on_chain')),
    timestamp TIMESTAMPTZ NOT NULL,
    signal_type TEXT NOT NULL,
    value NUMERIC(20, 8),
    metadata JSONB,
    z_score NUMERIC(10, 8),
    confluence_score NUMERIC(5, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('alt_data_signals', 'timestamp',
    if_exists => TRUE,
    migrate_data => TRUE,
    chunk_interval => INTERVAL '1 day'
);

CREATE TABLE llm_insights (
    id BIGSERIAL,
    symbol TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('causal', 'sentiment', 'contradiction', 'fed_parser', 'narrative')),
    content TEXT NOT NULL,
    confidence NUMERIC(5, 4),
    source TEXT,
    entities JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('llm_insights', 'timestamp',
    if_exists => TRUE,
    migrate_data => TRUE,
    chunk_interval => INTERVAL '1 day'
);


CREATE INDEX idx_microstructure_symbol_ts ON microstructure_raw (symbol, timestamp DESC);
CREATE INDEX idx_regime_symbol_ts ON regime_states (symbol, timestamp DESC);
CREATE INDEX idx_altdata_source_ts ON alt_data_signals (source, timestamp DESC);
CREATE INDEX idx_altdata_symbol_ts ON alt_data_signals (symbol, timestamp DESC);
CREATE INDEX idx_llm_insights_symbol_ts ON llm_insights (symbol, timestamp DESC);
CREATE INDEX idx_llm_insights_type_ts ON llm_insights (insight_type, timestamp DESC);


ALTER TABLE microstructure_raw SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol'
);

SELECT add_compression_policy('microstructure_raw', INTERVAL '7 days');

ALTER TABLE regime_states SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol'
);

SELECT add_compression_policy('regime_states', INTERVAL '7 days');

ALTER TABLE alt_data_signals SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'source'
);

SELECT add_compression_policy('alt_data_signals', INTERVAL '7 days');

ALTER TABLE llm_insights SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'insight_type'
);

SELECT add_compression_policy('llm_insights', INTERVAL '7 days');

SELECT add_retention_policy('microstructure_raw', INTERVAL '30 days');

COMMIT;