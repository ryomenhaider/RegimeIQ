# VektorLabs - Remaining Checklist Items

## Completed Fixes ✅

### Code Changes Made:
- `001_schema.sql`: Added `active_symbols` table
- `002_config.sql`: Added `tier_assignments`, `zscore_window`, `vpin_bucket_size` seed data
- `modules/microstructure/spread.py`: Created SpreadDecomposer class

### Checklist Marks Updated:
- Phase 0: Health endpoints, config retrieval ✅
- Phase 1: Ingestion stream naming ✅ (as designed)
- Phase 2: Microstructure spread/trade_flow ✅
- Phase 3-5: Regime/AltData/LLM ✅
- Phase 6: All API endpoints ✅
- Phase 7: Frontend (in dist/) ✅

---

## Remaining Items ⏳

### Runtime Verification (requires services):
- [ ] Docker services running: `docker compose up -d`
- [ ] Redis streams receiving data: `redis-cli xlen raw:orderbook:BTCUSDT`
- [ ] PostgreSQL connecting: `docker compose ps` shows healthy

### Phase 8 - Backtesting:
- [ ] backtest/engine.py: event-driven simulator
- [ ] backtest/simulator.py: order execution
- [ ] backtest/metrics.py: Sharpe, drawdown
- [ ] backtest/walk_forward.py: walk-forward validation

### Phase 9 - Deployment:
- [ ] Hetzner VPS provisioning
- [ ] Nginx config (deployment/nginx.conf)
- [ ] SSL certbot setup
- [ ] Production docker-compose.yml
- [ ] systemd service
- [ ] GitHub Actions CI/CD

### Phase 10 - Pre-Launch:
- [ ] Performance log populated (30+ days)
- [ ] OxaPay integration tested
- [ ] Security audit (bandit, npm audit)
- [ ] First user testing

### Ongoing - After Launch:
- [ ] Monitor Redis stream lag daily
- [ ] Retrain HMM models every 24 hours
- [ ] Review LLM insight quality weekly
- [ ] Update Binance symbol cache