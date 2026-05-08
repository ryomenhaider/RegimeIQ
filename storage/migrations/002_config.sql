
BEGIN;

INSERT INTO system_config (key, value, description) VALUES
-- Symbols to track
('symbols', '["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]', 'Trading symbols to track'),

-- Feature engineering windows
('feature_windows', '{"ofi": 50, "vpin": 100, "kyle_lambda": 200, "depth": 20}',
 'Feature calculation windows (ticks)'),

-- Z-score lookbacks for alternative data
('zscore_lookbacks', '{"reddit": 24, "google_trends": 168, "fred": 24}',
 'Z-score lookback periods (hours)'),

-- Reddit configuration
('reddit_subreddits', '["cryptocurrency", "Bitcoin", "ethereum", "binance", "CryptoMarkets"]',
 'Subreddits to monitor for sentiment'),
('reddit_poll_interval', '300', 'Reddit polling interval (seconds)'),

-- Google Trends configuration
('google_trends_keywords', '["bitcoin", "ethereum", "crypto", "blockchain", "solana"]',
 'Google Trends keywords to track'),
('google_trends_poll_interval', '3600', 'Google Trends polling interval (seconds)'),

-- FRED macro series
('fred_series', '["CPIAUCSL", "UNRATE", "DFF", "DTB3", "TENYEAR"]',
 'FRED economic series to track'),
('fred_poll_interval', '86400', 'FRED polling interval (seconds)'),

-- Orderbook configuration
('orderbook_levels', '{"BTCUSDT": 50, "default": 20}',
 'Orderbook depth levels per symbol'),

-- Batch write sizes
('batch_sizes', '{"alt_data": 50}',
 'Batch write sizes'),

-- Redis stream configuration
('redis_streams', '{"microstructure": 10000, "alt_data": 1000}',
 'Redis stream maxlen values'),

-- Binance WebSocket
('binance_ws_endpoint', '"wss://stream.binance.com:9443/ws"',
 'Binance WebSocket endpoint'),

-- Model parameters (HMM)
('hmm_params', '{"n_components": 4, "covariance_type": "diag", "n_iter": 100}',
  'HMM model parameters'),

-- Tier assignments for HMM models
('tier_assignments', '{"pro": ["BTCUSDT", "ETHUSDT"], "basic": ["SOLUSDT", "BNBUSDT"], "free": ["XRPUSDT"]}',
  'Symbol tier assignments by subscription tier'),

-- Z-score lookback window
('zscore_window', '100', 'Z-score lookback window (observations)'),

-- VPIN bucket size (USD notional)
('vpin_bucket_size', '500000', 'VPIN bucket size in USD notional'),

-- Regime confidence thresholds
('regime_confidence_threshold', '0.7', 'Minimum confidence for regime classification'),

-- LLM configuration
('llm_model', '"mistralai/mistral-7b-instruct:free"', 'LLM model to use'),
('llm_temperature', '0.3', 'LLM temperature parameter'),
('llm_max_tokens', '500', 'LLM max tokens response');

COMMIT;