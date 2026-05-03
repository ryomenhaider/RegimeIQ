import asyncio
import logging
import time
from typing import Optional

import aiohttp
from core.circuit_breaker import CircuitBreakerConfig, get_circuit_breaker
from core.redis_bus import get_redis

logger = logging.getLogger("ingestion.ingestors.on_chain")

BLOCKCHAIN_STATS_URL = "https://api.blockchain.info/stats"
MEMPOOL_FEES_URL = "https://mempool.space/api/v1/fees/recommended"
POLL_INTERVAL = 600


class OnChainIngestor:
    def __init__(self, session: aiohttp.ClientSession):
        self.session = session
        self._circuit_breaker = get_circuit_breaker(
            "blockchain",
            CircuitBreakerConfig(failure_threshold=3, window_seconds=120, wait_seconds=300)
        )
        self._redis = get_redis()
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("OnChainIngestor started")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("OnChainIngestor stopped")

    async def _poll_loop(self) -> None:
        while self._running:
            try:
                await self._fetch_blockchain_stats()
            except Exception as e:
                logger.warning(f"Blockchain stats fetch error: {e}")

            try:
                await self._fetch_mempool_fees()
            except Exception as e:
                logger.warning(f"Mempool fees fetch error: {e}")

            await asyncio.sleep(POLL_INTERVAL)

    async def _fetch_blockchain_stats(self) -> None:
        try:
            async with self.session.get(BLOCKCHAIN_STATS_URL, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    msg = {
                        "source": "blockchain_info",
                        "timestamp": int(time.time() * 1000),
                        "hash_rate": data.get("hashRate"),
                        "trade_volume_24h": data.get("tradeVolume24h"),
                        "transaction_count_24h": data.get("n_tx"),
                        "difficulty": data.get("difficulty"),
                        "type": "onchain"
                    }
                    await self._redis.publish("raw:onchain", msg)
                    logger.debug("Published blockchain stats")
        except Exception as e:
            logger.error(f"Failed to fetch blockchain stats: {e}")

    async def _fetch_mempool_fees(self) -> None:
        try:
            async with self.session.get(MEMPOOL_FEES_URL, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    msg = {
                        "source": "mempool",
                        "timestamp": int(time.time() * 1000),
                        "fastest_fee": data.get("fastestFee"),
                        "half_hour_fee": data.get("halfHourFee"),
                        "hour_fee": data.get("hourFee"),
                        "economy_fee": data.get("economyFee"),
                        "minimum_fee": data.get("minimumFee"),
                        "type": "onchain"
                    }
                    await self._redis.publish("raw:onchain", msg)
                    logger.debug("Published mempool fees")
        except Exception as e:
            logger.error(f"Failed to fetch mempool fees: {e}")