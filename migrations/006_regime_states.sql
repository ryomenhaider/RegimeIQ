-- Migration: 006_regime_states.sql
-- Regime detection states (TimescaleDB hypertable)

BEGIN;

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE IF NOT EXISTS regime_states (
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    regime VARCHAR(20) NOT NULL,
    confidence FLOAT NOT NULL,
    transition_probs JSONB NOT NULL,
    time_in_regime_seconds INT,
    model_tier VARCHAR(20),
    model_reliable BOOLEAN,
    PRIMARY KEY (symbol, timestamp)
);

SELECT create_hypertable('regime_states', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_regime_states_symbol_ts
    ON regime_states(symbol, timestamp DESC);

COMMIT;