-- Migration: 010_backtest_jobs.sql
-- Backtest job tracking

BEGIN;

CREATE TABLE IF NOT EXISTS backtest_jobs (
    job_id UUID PRIMARY KEY,
    username VARCHAR(20) NOT NULL REFERENCES users(username),
    status VARCHAR(20) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued','running','complete','failed')),
    request JSONB NOT NULL,
    results JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_backtest_jobs_username
    ON backtest_jobs(username, created_at DESC);

COMMIT;