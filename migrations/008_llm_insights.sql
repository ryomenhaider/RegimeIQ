-- Migration: 008_llm_insights.sql
-- LLM-generated insights storage

BEGIN;

CREATE TABLE IF NOT EXISTS llm_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(20) NOT NULL,
    document_type VARCHAR(20),
    entity VARCHAR(255),
    summary TEXT NOT NULL,
    causal_chain JSONB NOT NULL,
    affected_assets TEXT[] NOT NULL DEFAULT '{}',
    source_sentence TEXT,
    confidence FLOAT,
    timestamp TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_llm_insights_timestamp
    ON llm_insights(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_llm_insights_assets
    ON llm_insights USING GIN(affected_assets);

COMMIT;