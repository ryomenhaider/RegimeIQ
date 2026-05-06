-- Migration: 003_user_settings.sql
-- User preferences and settings

BEGIN;

CREATE TABLE IF NOT EXISTS user_settings (
    username VARCHAR(20) PRIMARY KEY REFERENCES users(username),
    alert_threshold FLOAT NOT NULL DEFAULT 0.75,
    discord_webhook TEXT,
    reddit_subs TEXT[] NOT NULL DEFAULT '{}',
    fred_series TEXT[] NOT NULL DEFAULT '{T10Y2Y,CPIAUCSL,FEDFUNDS}',
    trends_keywords TEXT[] NOT NULL DEFAULT '{}',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    default_tab VARCHAR(20) NOT NULL DEFAULT 'microstructure',
    layout_config JSONB NOT NULL DEFAULT '{}',
    notifications JSONB NOT NULL DEFAULT '{"email":true,"regime_alerts":true,"weekly_summary":false}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;