
import asyncio
import logging
import os
from typing import Any, Optional

import aiohttp

from core.config import get_config
from core.redis_bus import get_redis
from modules.altdata.extractors.macro_overlay import MacroOverlay
from modules.altdata.extractors.sentiment import SentimentVelocity

logger = logging.getLogger(__name__)

FRED_API_URL = "https://api.stlouisfed.org/fred"
INTERVAL = 86400

SERIES = {
    "yield_curve": "T10Y2Y",
    "cpi": "CPIAUCSL",
    "fed_funds": "FEDFUNDS"
}


class FREDIngestor:

    def __init__(self) -> None:
        self._running = False
        self._redis = get_redis()
        self._config = get_config()
        self._session: Optional[aiohttp.ClientSession] = None

        self._api_key = os.getenv("FRED_API_KEY", "")
        if not self._api_key:
            logger.warning("FRED_API_KEY not set - FRED ingestor may fail")

        self._macro = MacroOverlay()

        self._cpi_history: list[float] = []
        self._fed_history: list[float] = []

        self._cpi_velocity = SentimentVelocity("cpi")
        self._fed_velocity = SentimentVelocity("fed_funds")

    async def start(self) -> None:
        self._running = True
        self._session = aiohttp.ClientSession()
        asyncio.create_task(self._run_loop())
        logger.info("FREDIngestor started")

    async def stop(self) -> None:
        self._running = False
        if self._session:
            await self._session.close()
        logger.info("FREDIngestor stopped")

    async def _run_loop(self) -> None:
        while self._running:
            attempt = 0
            while attempt < 3:
                try:
                    await self._fetch_all()
                    break
                except Exception as e:
                    attempt += 1
                    wait = 2 ** attempt
                    logger.warning(f"FRED retry {attempt}/3: {e}")
                    if attempt < 3:
                        await asyncio.sleep(wait)
            await asyncio.sleep(INTERVAL)

    async def _fetch_all(self) -> None:
        if not self._session or not self._api_key:
            return

        yield_curve = await self._fetch_series("yield_curve")
        cpi = await self._fetch_series("cpi")
        fed_funds = await self._fetch_series("fed_funds")

        if not yield_curve and not cpi and not fed_funds:
            logger.warning("No FRED data fetched")
            return

        prev_cpi = self._cpi_history[-1] if self._cpi_history else cpi
        prev_fed = self._fed_history[-1] if self._fed_history else fed_funds

        if cpi:
            self._cpi_history.append(cpi)
            if len(self._cpi_history) > 30:
                self._cpi_history = self._cpi_history[-30:]
        if fed_funds:
            self._fed_history.append(fed_funds)
            if len(self._fed_history) > 30:
                self._fed_history = self._fed_history[-30:]

        ts = int(asyncio.get_event_loop().time() * 1000)

        macro_signal = self._macro.update(
            yield_curve=yield_curve or 0,
            cpi_yoy=cpi or 0,
            fed_funds_rate=fed_funds or 0,
            prev_cpi=prev_cpi or 0,
            prev_fed_funds=prev_fed or 0,
            timestamp=ts
        )

        _, cpi_vel_z = self._cpi_velocity.update(cpi or 0, ts)
        _, fed_vel_z = self._fed_velocity.update(fed_funds or 0, ts)

        velocity_z = max(abs(cpi_vel_z), abs(fed_vel_z))

        signal = {
            "source": "macro",
            "score": macro_signal.score,
            "z_score": abs(velocity_z),
            "velocity_z": velocity_z,
            "yield_curve": macro_signal.yield_curve,
            "cpi_yoy": macro_signal.cpi_yoy,
            "fed_funds_rate": macro_signal.fed_funds_rate,
            "risk_regime": macro_signal.regime,
            "confidence": macro_signal.confidence,
            "timestamp": ts
        }

        await self._redis.publish("altdata:signals", signal)
        logger.debug(f"Published macro signal: regime={macro_signal.regime}")

    async def _fetch_series(self, series_key: str) -> Optional[float]:
        series_id = SERIES.get(series_key)
        if not series_id or not self._api_key:
            return None

        try:
            url = f"{FRED_API_URL}/series/observations"
            params = {
                "series_id": series_id,
                "api_key": self._api_key,
                "observation_start": "2024-01-01",
                "limit": 1,
                "sort": "desc"
            }

            async with self._session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    observations = data.get("observations", [])
                    if observations:
                        value = observations[0].get("value")
                        if value and value != ".":
                            return float(value)

        except Exception as e:
            logger.warning(f"FRED {series_key} fetch error: {e}")

        return None