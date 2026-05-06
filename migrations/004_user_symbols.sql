-- Migration: 004_user_symbols.sql
-- User watchlist and symbol subscription tracking

BEGIN;

CREATE TABLE IF NOT EXISTS user_symbols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(20) NOT NULL REFERENCES users(username),
    symbol VARCHAR(20) NOT NULL,
    model_tier VARCHAR(20) NOT NULL DEFAULT 'mid',
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(username, symbol)
);

CREATE INDEX IF NOT EXISTS idx_user_symbols_username ON user_symbols(username);

CREATE TABLE IF NOT EXISTS symbol_subscriptions (
    symbol VARCHAR(20) PRIMARY KEY,
    subscriber_count INT NOT NULL DEFAULT 0,
    stream_active BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;