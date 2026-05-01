import asyncio
import logging
from typing import Any, Optional

from core.redis_bus import get_redis
from ingestion.load import get_loader
from ingestion.transform import (
    AltDataPoint,
    FuturesSnapshot,
    OrderBookSnapshot,
    TradeEvent,
    get_transformer,
)

logger = logging.getLogger("ingestion.pipeline")


class Pipeline:
    def __init__(self):
        self._redis = get_redis()
        self._transformer = get_transformer()
        self._loader = get_loader()
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        await self._loader.start()
        self._running = True
        self._task = asyncio.create_task(self._run())
        logger.info("Pipeline started")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        await self._loader.stop()
        logger.info("Pipeline stopped")

    async def _run(self) -> None:
        last_ids = {
            "stream:microstructure": "0-0",
            "stream:futures": "0-0",
            "stream:altdata": "0-0",
        }

        while self._running:
            for stream in list(last_ids.keys()):
                messages = await self._redis.consume(stream, last_ids[stream])
                for msg_id, fields in messages.items():
                    data = self._redis.decode_message(fields)
                    await self._process_message(stream, data)
                    last_ids[stream] = msg_id

            await asyncio.sleep(0.1)

    async def _process_message(self, stream: str, data: dict[str, Any]) -> None:
        try:
            if stream == "stream:microstructure":
                msg_type = data.get("type", "")
                if msg_type == "orderbook":
                    snapshot = self._transformer.transform_orderbook(data)
                    await self._loader.load_orderbook(snapshot)
                elif msg_type == "trade":
                    trade = self._transformer.transform_trade(data)
                    await self._loader.load_trade(trade)

            elif stream == "stream:futures":
                futures = self._transformer.transform_futures(data)
                await self._loader.load_futures(futures)

            elif stream == "stream:altdata":
                altdata = self._transformer.transform_altdata(data)
                await self._loader.load_altdata(altdata)

        except Exception as e:
            logger.error(f"Pipeline processing error: {e}")


_pipeline: Optional[Pipeline] = None


async def init_pipeline() -> Pipeline:
    global _pipeline
    _pipeline = Pipeline()
    await _pipeline.start()
    return _pipeline


def get_pipeline() -> Optional[Pipeline]:
    return _pipeline