# RegimeIQ

> **Institutional-grade market intelligence for crypto futures traders.**
> Real-time microstructure analysis, probabilistic regime detection, alternative data confluence, and LLM-powered causal reasoning — unified in one platform.

---

## What It Does

Most traders lose because they use the right strategy in the wrong market condition. RegimeIQ solves that.

It tells you — in real time — what kind of market you're in, what the institutional order flow looks like, what alternative data is signaling, and what the news actually *means* causally. Every signal is regime-adjusted, explainable, and backed by math.

---

## Modules

### 1. Market Microstructure Modeler
Models the invisible mechanics of price formation at the order level.

- **Order Flow Imbalance (OFI)** — net buy/sell pressure in real time
- **VPIN** — Volume-synchronized Probability of Informed Trading
- **Kyle's Lambda** — price impact per unit of order flow
- **Glosten-Milgrom Spread Decomposition** — adverse selection vs inventory cost
- **Trade Intensity Index** — how aggressively orders are hitting the book
- **Depth Profile** — liquidity distribution across price levels

### 2. Regime Detector
Probabilistic HMM-based classifier. Not rules — probabilities.

- **4 regimes:** Trending, Mean-Reverting, Volatile, Illiquid
- **Transition probability matrix** — how likely is a regime shift right now
- **Confidence score** — posterior probability of current regime
- **Time-in-regime tracker** — regime duration and stability
- **Macro regime overlay** — risk-on vs risk-off context from FRED
- **Volatility regime layer** — low/mid/high vol states

### 3. Alternative Data Intelligence
Finds signals in data that doesn't look like financial data.

- **Binance Futures** — funding rates, open interest, liquidation cascades (free)
- **On-chain data** — exchange flows, mempool pressure via Blockchain.com + Blockchair
- **Google Trends** — search spike detection with lag analysis
- **Reddit** — sentiment velocity, not absolute sentiment
- **FRED** — CPI, yield curve, unemployment macro pulse
- **Confluence Engine** — cross-signal correlation, lead/lag classifier

### 4. LLM Financial Reasoner
Reads text. Reasons causally. Extracts signals humans miss.

- **Earnings transcript analyzer** — guidance language → forward signal
- **SEC filing anomaly detector** — language shifts between filings
- **Fed statement parser** — hawkish/dovish shift with confidence score
- **News causal chain extractor** — not sentiment, causality
- **Contradiction detector** — when management says one thing, numbers say another
- **Reddit narrative tracker** — which narratives are gaining vs dying

---

## Architecture

```
External Sources (Binance, FRED, Reddit, NewsAPI, SEC EDGAR, Blockchain.com)
        │
        ▼
Ingestion Layer (Async WebSocket + REST fetchers)
        │
        ▼
Feature Engineering
        │
        ├──► Microstructure Modeler
        ├──► Regime Detector
        ├──► Alternative Data Intelligence
        └──► LLM Financial Reasoner
                        │
                        ▼
              Redis Signal Bus (Streams)
                        │
                        ▼
          FastAPI + WebSocket + Dashboard
```

### Core Stack

| Layer | Technology |
|---|---|
| Runtime | Python 3.11+ async |
| API | FastAPI + Uvicorn |
| Regime ML | hmmlearn (HMM) |
| Database | PostgreSQL |
| Cache / Bus | Redis Streams |
| LLM | OpenRouter (Mistral / LLaMA free tier) |
| Deployment | Docker Compose |

---

## Project Structure

```
regimeiq/
│
├── core/                          # Config, DB, Redis bus, state
├── modules/
│   ├── microstructure/            # OFI, VPIN, Kyle's Lambda, spread
│   ├── regime/                    # HMM classifier, trainer, predictor
│   ├── altdata/
│   │   ├── ingestors/             # FRED, Reddit, Google Trends, Binance futures, on-chain
│   │   ├── extractors/            # Sentiment velocity, spike detection, macro overlay
│   │   └── confluence.py          # Cross-signal correlation engine
│   └── llm_reasoner/
│       ├── fetchers/              # SEC EDGAR, NewsAPI, transcripts
│       ├── prompts/               # Causal extraction, Fed parser, contradiction
│       └── reasoners.py           # Main LLM engine
│
├── ingestion/                     # ETL pipeline
│   ├── extract.py                 # Raw data extraction (WebSocket + REST)
│   ├── transform.py               # Normalization + feature preparation
│   ├── load.py                    # Write to database + Redis bus
│   └── pipeline.py                # Pipeline orchestration
├── migrations/                     # SQL migrations
├── storage/                        # DB migrations, SQL queries
├── deployment/                     # Docker Compose, systemd
├── tests/                         # Unit + integration
├── main.py                        # FastAPI application entry point
└── dashboard.py                   # Dashboard application
```

---

## Installation

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- Docker + Docker Compose (recommended)
- Binance account (data only, no trading)
- OpenRouter API key (free tier sufficient)

### Clone & Install

```bash
git clone https://github.com/yourusername/regimeiq.git
cd regimeiq

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/regimeiq
REDIS_URL=redis://localhost:6379

# LLM (OpenRouter — free tier)
OPENROUTER_API_KEY=sk-or-...
LLM_MODEL=mistralai/mistral-7b-instruct:free

# Alerts
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Auth
JWT_SECRET=your-secret-key

# External APIs
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
NEWSAPI_KEY=...
FRED_API_KEY=...
```

### Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE regimeiq;"

# Run migrations
python -m storage.migrations.run
```

### Run

```bash
# Development
make dev

# Production (Docker)
docker-compose up -d
```

---

## API Reference

### REST

| Endpoint | Method | Description |
|---|---|---|
| `/api/regime/current` | GET | Current regime state + confidence |
| `/api/microstructure/current` | GET | Live OFI, VPIN, spread metrics |
| `/api/altdata/confluence` | GET | Cross-signal confluence score |
| `/api/insights/latest` | GET | Latest LLM causal insights |
| `/api/backtest/run` | POST | Run regime-adjusted backtest |
| `/api/auth/login` | POST | JWT authentication |
| `/api/auth/register` | POST | User registration |
| `/api/users/{username}/settings` | GET | Fetch user settings |
| `/api/users/{username}/settings` | PUT | Update user settings |
| `/api/health` | GET | System health check |

### WebSocket

Connect to `ws://localhost:8000/ws` for real-time updates.

```python
import websockets
import json

async def listen():
    async with websockets.connect("ws://localhost:8000/ws") as ws:
        await ws.send(json.dumps({"type": "auth", "token": "your-jwt"}))
        async for msg in ws:
            data = json.loads(msg)
            # regime_update | microstructure_update | altdata_signal | llm_insight

asyncio.run(listen())
```

### WebSocket Message Types

| Type | Description |
|---|---|
| `regime_update` | Regime state change with transition probabilities |
| `microstructure_update` | OFI, VPIN, spread update |
| `altdata_signal` | New alternative data signal |
| `llm_insight` | New causal insight from LLM reasoner |

---

## Data Sources

| Source | Data | Cost |
|---|---|---|
| Binance WebSocket | L2 order book, trades, funding rates, OI, liquidations | Free |
| FRED | CPI, yield curve, unemployment, macro series | Free |
| Reddit (PRAW) | Subreddit sentiment + volume | Free |
| Google Trends (pytrends) | Search volume + spike detection | Free |
| Blockchain.com API | On-chain volume, exchange flows | Free |
| Blockchair API | Multi-chain on-chain data | Free (tier) |
| Mempool.space API | BTC mempool, fees, UTXO | Free |
| SEC EDGAR | 8-K, 10-Q filings | Free |
| NewsAPI | News headlines | Free (tier) |
| OpenRouter | LLM inference | Free (tier) |

**Total infrastructure cost: $0 to start.**

---

## Configuration

No hardcoded YAML files. All configuration is stored in PostgreSQL and managed at runtime through the API or user dashboard.

### System Config (Admin Only)

Managed via `/api/admin/*` — never exposed to users:

- HMM model parameters and confidence floors
- Regime classifier thresholds
- ML retraining intervals
- Feature engineering windows (VPIN bucket size, OFI window, Kyle's Lambda window)
- Infrastructure settings

These settings are protected. Users cannot modify anything that affects signal integrity or model behavior across the platform.

### User Config (Per User)

Every user has their own settings page at `/dashboard/{username}/settings`:

| Setting | Description |
|---|---|
| Watched symbols | Which assets to track (BTC, ETH, SOL, etc.) |
| Alert preferences | Discord webhook URL, alert thresholds |
| Dashboard layout | Widget arrangement and visibility |
| Reddit subreddits | Custom subreddits to monitor |
| Google Trends keywords | Custom search terms to track |
| FRED macro series | Which macro indicators to display |
| Display timezone | Local timezone for all timestamps |

User settings are isolated — one user's configuration never affects another's.

---

## Development

```bash
# Lint
make lint

# Type check
make typecheck

# Tests
make test

# Coverage
make coverage
```

---

## Deployment (VPS)

```bash
# Clone on server
git clone https://github.com/yourusername/regimeiq.git

# Configure
cp .env.example .env && nano .env

# Start all services
docker-compose up -d
```

---

## Roadmap

- [x] Module 1: Microstructure Modeler
- [x] Module 2: Regime Detector (HMM)
- [x] Module 3: Alternative Data Intelligence
- [x] Module 4: LLM Financial Reasoner
- [x] Dashboard
- [ ] Backtesting Engine
- [ ] Authentication + Subscription system
- [ ] Public performance log (dated, transparent)
- [ ] API access tier

---

## Disclaimer

RegimeIQ is for informational and research purposes only. It does not execute trades and is not financial advice. Cryptocurrency trading involves substantial risk. Past signal accuracy does not guarantee future results. Always do your own analysis.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>RegimeIQ</strong> — Know what the market is doing before it does it.
</p>