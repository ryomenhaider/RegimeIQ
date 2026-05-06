-- Migration: 011_system_config.sql
-- System configuration key-value store

BEGIN;

CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_config (key, value) VALUES
    ('whale_threshold_btc', '100'),
    ('vpin_bucket_size_default', '1000000'),
    ('ofi_n_levels_default', '10'),
    ('hmm_min_observations', '1000'),
    ('alert_confluence_default', '0.75'),
    ('chat_limit_trial', '5'),
    ('chat_limit_standard', '50')
ON CONFLICT (key) DO NOTHING;

COMMIT;