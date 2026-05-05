"""Altdata ingestors for alternative data sources."""

from modules.altdata.ingestors.binance_futures import BinanceFuturesIngestor
from modules.altdata.ingestors.fred import FREDIngestor
from modules.altdata.ingestors.google_trends import TrendsIngestor
from modules.altdata.ingestors.on_chain import OnChainIngestor
from modules.altdata.ingestors.reddit import RedditIngestor

__all__ = [
    "BinanceFuturesIngestor",
    "FREDIngestor",
    "TrendsIngestor",
    "OnChainIngestor",
    "RedditIngestor",
]