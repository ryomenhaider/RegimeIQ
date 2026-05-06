-- Migration: 005_microstructure_raw.sql
-- Market microstructure metrics (TimescaleDB hypertable)

BEGIN;

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE IF NOT EXISTS microstructure_raw (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    ofi FLOAT,
    ofi_ma_10 FLOAT,
    vpin FLOAT,
    kyle_lambda FLOAT,
    cvd FLOAT,
    trade_intensity FLOAT,
    spread FLOAT,
    mid_price FLOAT,
    weighted_mid_price FLOAT,
    depth_imbalance FLOAT,
    adverse_selection_pct FLOAT,
    vwap_deviation FLOAT,
    bid_pressure FLOAT,
    ask_pressure FLOAT,
    PRIMARY KEY (symbol, timestamp)
);

SELECT create_hypertable('microstructure_raw', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_microstructure_raw_symbol_ts
    ON microstructure_raw(symbol, timestamp DESC);

COMMIT;