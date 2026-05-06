-- Migration: 012_audit_log.sql
-- Admin audit trail

BEGIN;

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target VARCHAR(255),
    payload JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp
    ON audit_log(timestamp DESC);

COMMIT;