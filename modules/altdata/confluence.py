"""Confluence engine for alternative data signals.

Consumes altdata:signals stream.
Computes weighted confluence across sources.
Weekly Granger causality test for lead/lag classification.
"""

import asyncio
import json
import logging
from collections import deque
from datetime import datetime
from math import tanh
from typing import Any, Optional

from core.config import get_config
from core.database import get_db
from core.redis_bus import get_redis

logger = logging.getLogger(__name__)

CONSUMER_GROUP = "confluence-engine"
STREAM_KEY = "altdata:signals"
OUTPUT_STREAM = "altdata:confluence"

WEIGHTS = {
    "leading": 2.0,
    "coincident": 1.0,
    "lagging": 0.5
}

DIRECTION_LABELS = {
    (0.7, 1.0): "strong_bullish",
    (0.3, 0.7): "bullish",
    (-0.3, 0.3): "neutral",
    (-0.7, -0.3): "bearish",
    (-1.0, -0.7): "strong_bearish"
}


class ConfluenceEngine:
    """Computes confluence from multiple altdata sources.

    Consumes altdata:signals, computes weighted confluence,
    runs weekly Granger causality for lead/lag classification.
    """

    def __init__(self) -> None:
        self._running = False
        self._redis = get_redis()
        self._db = get_db()
        self._config = get_config()

        self._latest_signals: dict[str, dict[str, Any]] = {}
        self._lead_lag: dict[str, str] = {}
        self._alert_threshold = self._config.get("alert_threshold", 0.7)

        self._history: deque = deque(maxlen=1000)

    async def start(self) -> None:
        self._running = True

        try:
            await self._redis.redis.xgroup_create(
                STREAM_KEY,
                CONSUMER_GROUP,
                id="0",
                mkstream=True
            )
        except Exception as e:
            if "BUSYGROUP" not in str(e):
                raise

        self._init_lead_lag()
        asyncio.create_task(self._consume_loop())
        asyncio.create_task(self._weekly_granger())
        logger.info("ConfluenceEngine started")

    def _init_lead_lag(self) -> None:
        default_sources = ["reddit", "trends", "macro", "futures", "onchain"]
        for source in default_sources:
            if source not in self._lead_lag:
                self._lead_lag[source] = "coincident"

    async def stop(self) -> None:
        self._running = False
        logger.info("ConfluenceEngine stopped")

    async def _consume_loop(self) -> None:
        last_id = "0-0"

        while self._running:
            try:
                messages = await self._redis.redis.xreadgroup(
                    CONSUMER_GROUP,
                    "confluence",
                    {STREAM_KEY: last_id},
                    count=10,
                    block=5000
                )

                if not messages:
                    continue

                for stream_name, stream_messages in messages:
                    for msg_id, fields in stream_messages:
                        await self._process_signal(json.loads(fields.get("data", "{}")))
                        await self._redis.redis.xack(STREAM_KEY, CONSUMER_GROUP, msg_id)
                        last_id = msg_id

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Consume loop error: {e}")
                await asyncio.sleep(1)

    async def _process_signal(self, signal: dict[str, Any]) -> None:
        source = signal.get("source")
        if not source:
            return

        signal["updated_at"] = datetime.utcnow().isoformat() + "Z"
        self._latest_signals[source] = signal
        self._history.append((source, signal))

        if len(self._latest_signals) < 2:
            return

        confluence = self._compute_confluence()
        if confluence is None:
            return

        direction = self._classify_direction(confluence)
        alert = self._check_alert(confluence)

        output = {
            "type": "altdata_confluence",
            "score": confluence,
            "direction": direction,
            "alert_triggered": alert,
            "sources": self._latest_signals.copy(),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        await self._redis.publish(OUTPUT_STREAM, output)
        logger.debug(f"Published confluence: {confluence:.2f}, direction={direction}")

        asyncio.create_task(self._write_db(output))

    def _compute_confluence(self) -> Optional[float]:
        if len(self._latest_signals) < 2:
            return None

        weighted_sum = 0.0
        total_weight = 0.0

        for source, signal in self._latest_signals.items():
            lead_lag = self._lead_lag.get(source, "coincident")
            weight = WEIGHTS.get(lead_lag, 1.0)

            velocity_z = signal.get("velocity_z", 0.0)
            score = signal.get("score", 0.0)
            direction = 1 if score > 0 else -1

            signal_s = tanh(velocity_z * direction)

            weighted_sum += weight * signal_s
            total_weight += weight

        if total_weight == 0:
            return 0.0

        confluence = weighted_sum / total_weight
        return max(-1.0, min(1.0, confluence))

    def _classify_direction(self, score: float) -> str:
        for (low, high), label in DIRECTION_LABELS.items():
            if low <= score < high:
                return label
        return "neutral"

    def _check_alert(self, confluence: float) -> bool:
        if abs(confluence) < self._alert_threshold:
            return False

        agree_count = 0
        for source, signal in self._latest_signals.items():
            score = signal.get("score", 0)
            if (confluence > 0 and score > 0) or (confluence < 0 and score < 0):
                agree_count += 1

        return agree_count >= 3

    async def _write_db(self, output: dict[str, Any]) -> None:
        try:
            await self._db.execute(
                """
                INSERT INTO alt_data_signals (
                    symbol, source, timestamp, signal_type,
                    value, metadata, z_score, confluence_score
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                "GLOBAL",
                "confluence",
                datetime.utcnow(),
                "confluence",
                output["score"],
                json.dumps(output.get("sources", {})),
                0.0,
                output["score"]
            )
        except Exception as e:
            logger.error(f"DB write error: {e}")

    async def _weekly_granger(self) -> None:
        WEEKLY = 604800

        while self._running:
            await asyncio.sleep(WEEKLY)

            try:
                await self._run_granger_tests()
            except Exception as e:
                logger.error(f"Granger test error: {e}")

    async def _run_granger_tests(self) -> None:
        sources = list(self._latest_signals.keys())

        for source in sources:
            try:
                data = await self._fetch_timeseries(source, days=30)
                if len(data) < 50:
                    logger.debug(f"Not enough data for Granger test: {source}")
                    continue

                classification = await self._granger_test(data)
                old = self._lead_lag.get(source, "coincident")
                self._lead_lag[source] = classification

                logger.info(f"Granger: {source}: {old} -> {classification}")

            except Exception as e:
                logger.warning(f"Granger test failed for {source}: {e}")

    async def _fetch_timeseries(self, source: str, days: int) -> list[float]:
        try:
            rows = await self._db.fetch(
                """
                SELECT value FROM alt_data_signals
                WHERE source = $1 AND timestamp > NOW() - INTERVAL '1 day' * $2
                ORDER BY timestamp ASC
                """,
                source,
                days
            )
            return [row["value"] for row in rows if row.get("value") is not None]
        except Exception:
            return []

    async def _granger_test(self, series: list[float]) -> str:
        try:
            import numpy as np
            from statsmodels.tsa.stattools import grangercausalitytests

            if len(series) < 50:
                return "coincident"

            diff = np.diff(series)
            if len(diff) < 10:
                return "coincident"

            data = np.column_stack([diff[1:], diff[:-1]])

            result = grangercausalitytests(data, maxlag=4, verbose=False)

            for lag in range(1, 5):
                p_value = result[lag][0]["ssr_ftest"][1]
                if p_value < 0.05:
                    return "leading"

            return "lagging"

        except ImportError:
            logger.warning("statsmodels not available - skipping Granger test")
            return "coincident"
        except Exception as e:
            logger.warning(f"Granger test error: {e}")
            return "coincident"