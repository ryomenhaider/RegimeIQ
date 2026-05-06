-- Migration: 007_alt_data_signals.sql
-- Alternative data signals (TimescaleDB hypertable)

BEGIN;

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE IF NOT EXISTS alt_data_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(20) NOT NULL,
    symbol VARCHAR(20),
    score FLOAT NOT NULL,
    z_score FLOAT,
    velocity_z FLOAT,
    payload JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL
);

SELECT create_hypertable('alt_data_signals', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_alt_data_signals_source_ts
    ON alt_data_signals(source, timestamp DESC);

COMMIT;