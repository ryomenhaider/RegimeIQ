"""Ingestor for Binance futures data.

Fetches funding rate, open interest, and liquidations.
Processes into altdata signals with spike detection.
"""

import asyncio
import logging
from math import tanh
from typing import Any, Optional

import aiohttp

from core.circuit_breaker import CircuitBreakerConfig, get_circuit_breaker
from core.config import get_config
from core.redis_bus import get_redis
from modules.altdata.extractors.sentiment import SentimentVelocity
from modules.altdata.extractors.spike_detector import SpikeDetector

logger = logging.getLogger(__name__)

BINANCE_API = "https://fapi.binance.com/fapi/v1"
INTERVAL = 60


class BinanceFuturesIngestor:
    """Ingestor for Binance futures data.

    Fetches funding rate, open interest, and liquidations.
    Runs SentimentVelocity on funding and OI.
    Runs SpikeDetector on liquidation volume.
    """

    def __init__(self, symbols: list[str]) -> None:
        self.symbols = set(symbols)
        self._running = False
        self._session: Optional[aiohttp.ClientSession] = None

        self._circuit = get_circuit_breaker(
            "binance_altdata",
            CircuitBreakerConfig(failure_threshold=3, window_seconds=60, wait_seconds=30)
        )

        self._redis = get_redis()
        self._config = get_config()

        self._funding_velocity: dict[str, SentimentVelocity] = {}
        self._oi_velocity: dict[str, SentimentVelocity] = {}
        self._liquidation_spike: dict[str, SpikeDetector] = {}

    async def start(self) -> None:
        self._running = True
        self._session = aiohttp.ClientSession()
        self._init_state()
        logger.info("BinanceFuturesIngestor started")
        asyncio.create_task(self._run_loop())

    def _init_state(self) -> None:
        for symbol in self.symbols:
            self._funding_velocity[symbol] = SentimentVelocity(f"funding:{symbol}")
            self._oi_velocity[symbol] = SentimentVelocity(f"oi:{symbol}")
            self._liquidation_spike[symbol] = SpikeDetector(f"liq:{symbol}")

    async def stop(self) -> None:
        self._running = False
        if self._session:
            await self._session.close()
        logger.info("BinanceFuturesIngestor stopped")

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
                    logger.warning(f"BinanceFutures retry {attempt}/3: {e}")
                    if attempt < 3:
                        await asyncio.sleep(wait)
            await asyncio.sleep(INTERVAL)

    async def _fetch_all(self) -> None:
        if not self._session:
            return

        for symbol in self.symbols:
            try:
                funding_data = await self._fetch_funding(symbol)
                oi_data = await self._fetch_oi(symbol)
                liq_data = await self._fetch_liquidations(symbol)

                score = self._compute_score(funding_data, oi_data)
                z_score = 0.0
                velocity_z = 0.0

                if funding_data and oi_data:
                    vel, vz = self._funding_velocity[symbol].update(
                        funding_data["funding_rate"], funding_data.get("timestamp", 0)
                    )
                    velocity_z = vz

                    vel2, _ = self._oi_velocity[symbol].update(
                        oi_data["open_interest"], oi_data.get("timestamp", 0)
                    )

                    z_score = abs(velocity_z) if abs(velocity_z) > 0 else abs(vel2)

                liq_spike = None
                if liq_data:
                    liq_spike = self._liquidation_spike[symbol].update(
                        liq_data.get("liquidations_1h", 0)
                    )

                ts = funding_data.get("timestamp") if funding_data else 0

                signal = {
                    "source": "futures",
                    "symbol": symbol,
                    "score": score,
                    "z_score": z_score,
                    "velocity_z": velocity_z,
                    "funding_rate": funding_data.get("funding_rate") if funding_data else None,
                    "open_interest": oi_data.get("open_interest") if oi_data else None,
                    "liquidations_1h": liq_data.get("liquidations_1h", 0) if liq_data else 0,
                    "is_spike": liq_spike.is_spike if liq_spike else False,
                    "timestamp": ts
                }

                await self._redis.publish("altdata:signals", signal)
                logger.debug(f"Published futures signal for {symbol}")

            except Exception as e:
                logger.error(f"Error fetching {symbol}: {e}")

    async def _fetch_funding(self, symbol: str) -> Optional[dict[str, Any]]:
        try:
            async with self._session.get(
                f"{BINANCE_API}/fundingRate",
                params={"symbol": symbol, "limit": 1}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data:
                        return {
                            "funding_rate": float(data[0].get("fundingRate", 0)),
                            "timestamp": int(data[0].get("fundingTime", 0))
                        }
        except Exception as e:
            logger.warning(f"Funding fetch error: {e}")
        return None

    async def _fetch_oi(self, symbol: str) -> Optional[dict[str, Any]]:
        try:
            async with self._session.get(
                f"{BINANCE_API}/openInterest",
                params={"symbol": symbol}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data:
                        return {
                            "open_interest": float(data[0].get("openInterest", 0)),
                            "timestamp": int(data[0].get("timestamp", 0))
                        }
        except Exception as e:
            logger.warning(f"OI fetch error: {e}")
        return None

    async def _fetch_liquidations(self, symbol: str) -> Optional[dict[str, Any]]:
        try:
            async with self._session.get(
                f"{BINANCE_API}/allOpenOrders",
                params={"symbol": symbol}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return {"liquidations_1h": len(data)}
        except Exception as e:
            logger.warning(f"Liquidation fetch error: {e}")
        return None

    def _compute_score(
        self,
        funding: Optional[dict],
        oi: Optional[dict]
    ) -> float:
        if not funding or not oi:
            return 0.0

        funding_rate = funding.get("funding_rate", 0)
        open_interest = oi.get("open_interest", 0)

        score = funding_rate * 1e4 + (open_interest / 1e9)

        return float(tanh(score * 0.1))