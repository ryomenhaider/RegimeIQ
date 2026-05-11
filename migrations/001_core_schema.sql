-- 001_core_schema.sql - Core tables needed by RegimeIQ

BEGIN;

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Microstructure raw data (order book levels, trades)
CREATE TABLE IF NOT EXISTS microstructure_raw (
    id BIGSERIAL,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    side TEXT CHECK (side IN ('buy', 'sell')),
    price NUMERIC(20, 8),
    quantity NUMERIC(20, 8),
    level INTEGER,
    cumulative_quantity NUMERIC(20, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ms_raw_symbol_ts ON microstructure_raw (symbol, timestamp DESC);

-- Microstructure aggregated metrics
CREATE TABLE IF NOT EXISTS microstructure (
    id BIGSERIAL,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    ofi NUMERIC(20, 8),
    ofi_ma_10 NUMERIC(20, 8),
    vpin NUMERIC(10, 8),
    kyle_lambda NUMERIC(20, 8),
    cvd NUMERIC(20, 8),
    trade_intensity NUMERIC(10, 6),
    spread NUMERIC(20, 8),
    mid_price NUMERIC(20, 8),
    weighted_mid_price NUMERIC(20, 8),
    depth_imbalance NUMERIC(10, 8),
    adverse_selection_pct NUMERIC(5, 4),
    vwap_deviation NUMERIC(20, 8),
    bid_pressure NUMERIC(10, 8),
    ask_pressure NUMERIC(10, 8),
    top_bid NUMERIC(20, 8),
    top_ask NUMERIC(20, 8),
    bids JSONB,
    asks JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_microstructure_symbol_ts ON microstructure (symbol, timestamp DESC);

-- Regime states (HMM predictions)
CREATE TABLE IF NOT EXISTS regime_states (
    id BIGSERIAL,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    regime TEXT NOT NULL CHECK (regime IN ('trending', 'mean_reverting', 'volatile', 'illiquid')),
    confidence NUMERIC(5, 4) NOT NULL,
    transition_probs JSONB,
    vpin NUMERIC(10, 8),
    kyle_lambda NUMERIC(20, 8),
    spread NUMERIC(20, 8),
    depth_imbalance NUMERIC(10, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regime_symbol_ts ON regime_states (symbol, timestamp DESC);

-- Alternative data signals
CREATE TABLE IF NOT EXISTS alt_data_signals (
    id BIGSERIAL,
    source TEXT NOT NULL,
    symbol TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    value NUMERIC(20, 8),
    z_score NUMERIC(10, 8),
    velocity_z NUMERIC(10, 8),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_altdata_source_ts ON alt_data_signals (source, timestamp DESC);
CREATE INDEX idx_altdata_symbol_ts ON alt_data_signals (symbol, timestamp DESC);

-- Binance futures data
CREATE TABLE IF NOT EXISTS futures_data (
    id BIGSERIAL,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    funding_rate NUMERIC(10, 8),
    open_interest NUMERIC(20, 2),
    liquidations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_futures_symbol_ts ON futures_data (symbol, timestamp DESC);

-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial config
INSERT INTO system_config (key, value, description) VALUES
    ('regime_update_interval', '5000', 'Regime predictor update interval in ms'),
    ('microstructure_window', '10', 'OFI window size'),
    ('vpin_bucket_size', '50', 'VPIN bucket size for volume'),
    ('alert_threshold', '0.8', 'Default alert confidence threshold'),
    ('redis_streams_maxlen', '10000', 'Max length for Redis streams'),
    ('llm_cache_ttl', '3600', 'LLM response cache TTL in seconds'),
    ('feature_flags', '{"enable_llm": true, "enable_altdata": true}', 'Feature flags')
ON CONFLICT (key) DO NOTHING;

COMMIT;