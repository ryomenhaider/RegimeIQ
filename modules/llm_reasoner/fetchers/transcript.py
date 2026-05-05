"""Fetcher for earnings call transcripts.

Fetches earnings call transcripts on earnings dates.
Polls daily for earnings calendar and fetches available transcripts.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Optional

import aiohttp

logger = logging.getLogger("llm_reasoner.fetchers.transcript")

TRANSCRIPT_SOURCES = {
    "earningswhispers": "https://api.earningswhispers.com/v1/transcripts/{ticker}",
    "seekingalpha": "https://seekingalpha.com/api/v1/symbol/{ticker}/earnings_transcript",
}

INTERVAL = 86400


class TranscriptFetcher:
    """Fetcher for earnings call transcripts.

    Checks earnings calendar daily.
    Fetches transcripts from configured sources.
    Returns None if unavailable — skip silently.
    """

    def __init__(self) -> None:
        self._session: Optional[aiohttp.ClientSession] = None
        self._tracked_assets = os.getenv("TRACKED_ASSETS", "BTC,ETH").split(",")
        self._primary_source = os.getenv("TRANSCRIPT_SOURCE", "earningswhispers")

    async def fetch(self) -> list[dict[str, Any]]:
        """Fetch transcripts for tracked assets with earnings dates."""
        if not self._session:
            self._session = aiohttp.ClientSession()

        results = []

        for asset in self._tracked_assets:
            ticker = asset.strip().upper()
            if not ticker:
                continue

            try:
                transcript = await self._fetch_transcript(ticker)
                if transcript:
                    results.append(transcript)
            except Exception as e:
                logger.warning(f"Transcript fetch error for {ticker}: {e}")
                continue

        return results

    async def _fetch_transcript(self, ticker: str) -> Optional[dict[str, Any]]:
        """Fetch transcript for a single ticker."""
        source_url = TRANSCRIPT_SOURCES.get(self._primary_source, "").format(ticker=ticker)

        if not source_url:
            logger.warning(f"Unknown transcript source: {self._primary_source}")
            return None

        try:
            async with self._session.get(source_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return None

                data = await resp.json()
                return self._process_transcript(ticker, data)

        except asyncio.TimeoutError:
            logger.warning(f"Transcript timeout for {ticker}")
            return None
        except Exception as e:
            await asyncio.sleep(5)
            return await self._retry_fetch(ticker, source_url)

    async def _retry_fetch(
        self,
        ticker: str,
        source_url: str
    ) -> Optional[dict[str, Any]]:
        """Retry once after 5 second delay."""
        try:
            async with self._session.get(source_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return None

                data = await resp.json()
                return self._process_transcript(ticker, data)

        except Exception as e:
            logger.warning(f"Transcript retry failed for {ticker}: {e}")
            return None

    def _process_transcript(
        self,
        ticker: str,
        data: dict[str, Any]
    ) -> Optional[dict[str, Any]]:
        """Process transcript response."""
        transcript_text = ""
        earnings_date = ""

        if self._primary_source == "earningswhispers":
            transcript_text = data.get("transcript", "")
            earnings_date = data.get("date", "")
        elif self._primary_source == "seekingalpha":
            items = data.get("data", {}).get("earningsCall", [])
            if items:
                transcript_text = items[0].get("body", "")
                earnings_date = items[0].get("date", "")

        if not transcript_text:
            return None

        return {
            "entity": ticker,
            "transcript_text": transcript_text,
            "earnings_date": earnings_date
        }

    async def close(self) -> None:
        if self._session:
            await self._session.close()
            self._session = None