-- 009_user_tables.sql
-- Fix schema mismatches between code and actual database

BEGIN;

-- 1. Create active_symbols if missing (needed by later queries)
CREATE TABLE IF NOT EXISTS active_symbols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT UNIQUE NOT NULL,
    has_dedicated_model BOOLEAN NOT NULL DEFAULT FALSE,
    model_tier TEXT,
    subscriber_count INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default symbols
INSERT INTO active_symbols (symbol, model_tier) VALUES
    ('BTCUSDT', 'high'), ('ETHUSDT', 'high'), 
    ('SOLUSDT', 'mid'), ('BNBUSDT', 'mid'), ('XRPUSDT', 'low')
ON CONFLICT (symbol) DO NOTHING;

-- 2. Add username column to user_settings for code compatibility
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS username TEXT;

-- Backfill existing rows
UPDATE user_settings us SET username = u.username
FROM users u WHERE us.user_id = u.id AND us.username IS NULL;

-- 3. Create user_symbols table (code references this but it doesn't exist)
CREATE TABLE IF NOT EXISTS user_symbols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    symbol TEXT NOT NULL,
    model_tier TEXT DEFAULT 'low',
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(username, symbol)
);

-- 4. Create symbol_subscriptions table
CREATE TABLE IF NOT EXISTS symbol_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT UNIQUE NOT NULL,
    subscriber_count INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill from active_symbols
INSERT INTO symbol_subscriptions (symbol, subscriber_count)
SELECT symbol, 1 FROM active_symbols
ON CONFLICT (symbol) DO NOTHING;

-- 5. Create symbol_stats table (referenced by check_viability)
CREATE TABLE IF NOT EXISTS symbol_stats (
    symbol TEXT PRIMARY KEY,
    days_of_data INTEGER DEFAULT 0,
    avg_daily_volume NUMERIC DEFAULT 0,
    model_tier TEXT DEFAULT 'low',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create payments table (referenced by payment service)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    plan TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

-- Record migration
INSERT INTO schema_migrations (name) VALUES ('009_user_tables.sql') ON CONFLICT DO NOTHING;
