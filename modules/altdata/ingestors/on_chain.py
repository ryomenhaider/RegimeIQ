import asyncio
import json
import logging
from math import tanh
from typing import Any, Optional

from core.config import get_config
from core.redis_bus import get_redis
from modules.altdata.extractors.spike_detector import SpikeDetector

logger = logging.getLogger(__name__)

STREAM_KEY = "raw:onchain"
INTERVAL = 600
DEFAULT_WHALE_THRESHOLD = 100


class OnChainIngestor:

    def __init__(self) -> None:
        self._running = False
        self._redis = get_redis()
        self._config = get_config()

        self._whale_threshold = self._config.get("whale_threshold_btc", DEFAULT_WHALE_THRESHOLD)
        logger.info(f"OnChainIngestor using whale threshold: {self._whale_threshold} BTC")

        self._whale_spike = SpikeDetector("whale_count")
        self._flow_history: list[float] = []
        self._last_id = "0"

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._run_loop())
        logger.info("OnChainIngestor started")

    async def stop(self) -> None:
        self._running = False
        logger.info("OnChainIngestor stopped")

    async def _run_loop(self) -> None:
        while self._running:
            attempt = 0
            while attempt < 3:
                try:
                    await self._consume_stream()
                    break
                except Exception as e:
                    attempt += 1
                    wait = 2 ** attempt
                    logger.warning(f"OnChain retry {attempt}/3: {e}")
                    if attempt < 3:
                        await asyncio.sleep(wait)
            await asyncio.sleep(INTERVAL)

    async def _consume_stream(self) -> None:
        try:
            messages = await self._redis.redis.xread(
                {STREAM_KEY: self._last_id},
                count=100,
                block=1000
            )

            if not messages:
                return

            exchange_inflows = 0.0
            exchange_outflows = 0.0
            whale_count = 0
            latest_timestamp = 0

            for stream_name, stream_messages in messages:
                for msg_id, fields in stream_messages:
                    self._last_id = msg_id
                    data = json.loads(fields.get("data", "{}"))

                    tx_type = data.get("type", "")
                    amount = float(data.get("amount", 0))
                    timestamp = int(data.get("timestamp", 0))

                    if tx_type == "inflow":
                        exchange_inflows += amount
                    elif tx_type == "outflow":
                        exchange_outflows += amount

                    if amount >= self._whale_threshold:
                        whale_count += 1

                    if timestamp > latest_timestamp:
                        latest_timestamp = timestamp

            net_flow = exchange_outflows - exchange_inflows
            self._flow_history.append(net_flow)

            if len(self._flow_history) > 50:
                self._flow_history = self._flow_history[-50:]

            score = float(tanh(net_flow / 1000))
            z_score = 0.0
            velocity_z = 0.0

            if len(self._flow_history) >= 3:
                import numpy as np
                recent = self._flow_history[-3:]
                mean = np.mean(recent)
                std = np.std(recent)
                if std > 0:
                    velocity_z = (net_flow - mean) / std

            whale_spike = self._whale_spike.update(whale_count)

            signal = {
                "source": "onchain",
                "symbol": "BTC",
                "score": score,
                "z_score": z_score,
                "velocity_z": velocity_z,
                "net_flow_btc": net_flow,
                "whale_count_1h": whale_count,
                "is_spike": whale_spike.is_spike,
                "timestamp": latest_timestamp
            }

            await self._redis.publish("altdata:signals", signal)
            logger.debug(f"Published onchain signal: net_flow={net_flow:.2f}")

        except Exception as e:
            logger.error(f"Consume stream error: {e}")