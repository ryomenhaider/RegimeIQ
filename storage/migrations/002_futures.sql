BEGIN;

CREATE TABLE IF NOT EXISTS futures_data (
    id BIGSERIAL,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    funding_rate NUMERIC(20, 8),
    open_interest NUMERIC(20, 8),
    liquidations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_futures_symbol_ts ON futures_data (symbol, timestamp DESC);

COMMIT;