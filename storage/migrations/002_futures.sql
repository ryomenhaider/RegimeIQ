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

SELECT create_hypertable('futures_data', 'timestamp',
    if_exists => TRUE, migrate_data => TRUE, chunk_interval => INTERVAL '1 day');

CREATE INDEX IF NOT EXISTS idx_futures_symbol_ts ON futures_data (symbol, timestamp DESC);

ALTER TABLE futures_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol'
);

SELECT add_compression_policy('futures_data', INTERVAL '7 days');

COMMIT;