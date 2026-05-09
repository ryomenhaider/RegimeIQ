-- Performance log table for walk-forward validated strategy results

CREATE TABLE IF NOT EXISTS performance_log (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    symbol TEXT NOT NULL,
    regime_called TEXT NOT NULL,
    confidence REAL NOT NULL,
    outcome TEXT CHECK (outcome IN ('correct', 'incorrect', 'pending')),
    return_pct REAL NOT NULL DEFAULT 0,
    entry_price REAL,
    exit_price REAL,
    holding_period_hours REAL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_log_date ON performance_log(date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_log_symbol ON performance_log(symbol);
CREATE INDEX IF NOT EXISTS idx_performance_log_outcome ON performance_log(outcome);

CREATE TABLE IF NOT EXISTS backtest_results (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    strategy TEXT NOT NULL,
    total_return_pct REAL NOT NULL,
    sharpe_ratio REAL,
    max_drawdown_pct REAL,
    win_rate REAL,
    total_trades INTEGER,
    params JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_symbol ON backtest_results(symbol);
CREATE INDEX IF NOT EXISTS idx_backtest_dates ON backtest_results(start_date, end_date);

INSERT INTO schema_migrations (name) VALUES ('010_performance_log.sql') ON CONFLICT (name) DO NOTHING;
