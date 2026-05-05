"""Ingestor for Google Trends data.

Uses pytrends to fetch trend interest for keywords.
Runs SpikeDetector on trend values.
"""

import asyncio
import logging
import os
from typing import Any, Optional

from core.config import get_config
from core.redis_bus import get_redis
from modules.altdata.extractors.spike_detector import SpikeDetector

logger = logging.getLogger("altdata.ingestors.google_trends")

INTERVAL = 3600
DEFAULT_KEYWORDS = ["bitcoin", "ethereum", "crypto crash", "buy bitcoin"]


class TrendsIngestor:
    """Ingestor for Google Trends.

    Uses pytrends to fetch keyword interest.
    Runs SpikeDetector on trend values.
    """

    def __init__(self) -> None:
        self._running = False
        self._redis = get_redis()
        self._config = get_config()

        self._keywords = self._config.get("google_trends_keywords", DEFAULT_KEYWORDS)
        logger.info(f"TrendsIngestor using keywords: {self._keywords}")

        self._trend_spike: dict[str, SpikeDetector] = {}
        self._history: dict[str, list[float]] = {}

    async def start(self) -> None:
        self._running = True
        self._init_state()
        asyncio.create_task(self._run_loop())
        logger.info("TrendsIngestor started")

    def _init_state(self) -> None:
        for kw in self._keywords:
            self._trend_spike[kw] = SpikeDetector(f"trends:{kw}")
            self._history[kw] = []

    async def stop(self) -> None:
        self._running = False
        logger.info("TrendsIngestor stopped")

    async def _run_loop(self) -> None:
        while self._running:
            attempt = 0
            while attempt < 3:
                try:
                    await self._fetch_trends()
                    break
                except Exception as e:
                    attempt += 1
                    wait = 2 ** attempt
                    logger.warning(f"Trends retry {attempt}/3: {e}")
                    if attempt < 3:
                        await asyncio.sleep(wait)
            await asyncio.sleep(INTERVAL)

    async def _fetch_trends(self) -> None:
        try:
            from pytrends.request import TrendReq

            pytrends = TrendReq(hl="en-US", tz=360)

            for keyword in self._keywords:
                try:
                    pytrends.build_payload(
                        cat=0,
                        qt=INTERVAL,
                        tz=360,
                        tn=f"gmap_{keyword.replace(' ', '_')}",
                        geo="",
                        timeframe="now 1-H"
                    )
                    data = pytrends.interest_over_time()

                    if data.empty:
                        continue

                    value = float(data[keyword].iloc[-1])

                    self._history[keyword].append(value)
                    if len(self._history[keyword]) > 30:
                        self._history[keyword] = self._history[keyword][-30:]

                    spike = self._trend_spike[keyword].update(value)

                    velocity_z = 0.0
                    if len(self._history[keyword]) >= 3:
                        recent = self._history[keyword][-3:]
                        if len(recent) >= 3 and recent[2] != recent[0]:
                            velocity_z = (recent[2] - recent[0]) / max(abs(recent[2] - recent[0]), 1)

                    signal = {
                        "source": "trends",
                        "symbol": keyword,
                        "score": value / 100,
                        "z_score": abs(spike.z_score),
                        "velocity_z": velocity_z,
                        "trend_value": value,
                        "is_spike": spike.is_spike,
                        "timestamp": int(asyncio.get_event_loop().time() * 1000)
                    }

                    await self._redis.publish("altdata:signals", signal)
                    logger.debug(f"Published trends signal for {keyword}")

                except Exception as e:
                    logger.warning(f"Error fetching {keyword}: {e}")

        except ImportError:
            logger.warning("pytrends not installed - skipping Trends ingestor")
        except Exception as e:
            logger.error(f"Trends fetch error: {e}")