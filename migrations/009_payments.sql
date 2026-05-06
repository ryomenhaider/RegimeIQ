-- Migration: 009_payments.sql
-- Payment tracking

BEGIN;

CREATE TABLE IF NOT EXISTS payments (
    invoice_id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(20) NOT NULL REFERENCES users(username),
    plan VARCHAR(20) NOT NULL,
    amount FLOAT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','paid','failed','expired')),
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_username
    ON payments(username, created_at DESC);

COMMIT;