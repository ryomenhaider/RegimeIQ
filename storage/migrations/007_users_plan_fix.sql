BEGIN;

-- Add plan column to users table (matching 001_schema.sql definition)
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

COMMIT;