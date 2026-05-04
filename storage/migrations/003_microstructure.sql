BEGIN;

CREATE TABLE microstructure (
    id BIGSERIAL,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    ofi NUMERIC(20, 8),
    ofi_ma_10 NUMERIC(20, 8),
    vpin NUMERIC(10, 8),
    kyle_lambda NUMERIC(20, 8),
    cvd NUMERIC(20, 8),
    trade_intensity NUMERIC(10, 8),
    spread NUMERIC(20, 8),
    mid_price NUMERIC(20, 8),
    weighted_mid_price NUMERIC(20, 8),
    depth_imbalance NUMERIC(10, 8),
    adverse_selection_pct NUMERIC(10, 8),
    vwap_deviation NUMERIC(10, 8),
    bid_pressure NUMERIC(20, 8),
    ask_pressure NUMERIC(20, 8),
    top_bid NUMERIC(20, 8),
    top_ask NUMERIC(20, 8),
    bids JSONB,
    asks JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('microstructure', 'timestamp', if_exists => TRUE, migrate_data => TRUE, chunk_interval => INTERVAL '1 day');

CREATE INDEX idx_microstructure_symbol_ts ON microstructure (symbol, timestamp DESC);

ALTER TABLE microstructure SET (timescaledb.compress, timescaledb.compress_segmentby = 'symbol');
SELECT add_compression_policy('microstructure', INTERVAL '7 days');

COMMIT;