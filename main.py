import asyncio
import logging
import signal
import sys
from pathlib import Path

from core.config import get_config
from core.database import init_db, get_db, run_migrations
from core.redis_bus import init_redis, get_redis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")


class VektorLabs:
    def __init__(self):
        self._running = False
        self._extractor = None
        self._microstructure_manager = None
        self._tasks: list[asyncio.Task] = []

    async def start(self) -> None:
        logger.info("Starting VektorLabs...")

        config = get_config()

        logger.info("[1/8] Initializing PostgreSQL connection...")
        await config.initialize()
        logger.info("PostgreSQL connected")

        logger.info("[2/8] Initializing Redis connection...")
        await init_redis(
            host=config.redis_cfg.host,
            port=config.redis_cfg.port,
            db=config.redis_cfg.db,
            password=config.redis_cfg.password,
            stream_maxlen=config.redis_cfg.stream_maxlen
        )
        logger.info("Redis connected")

        logger.info("[3/8] Running database migrations...")
        await run_migrations()
        logger.info("Migrations complete")

        logger.info("[4/8] Loading behavioral config...")
        await config._load_behavioral_config()
        logger.info(f"Loaded {len(config._behavioral_config)} config entries")

        logger.info("[5/8] Validating Binance symbol list...")
        await self._validate_binance_symbols()
        logger.info("Binance symbols validated and cached")

        logger.info("[6/8] Loading HMM models...")
        await self._load_hmm_models()
        logger.info("HMM models loaded")

        logger.info("[7/8] Starting ingestion layer...")
        await self._start_ingestion()
        logger.info("Ingestion layer started")

        logger.info("[8/8] Starting intelligence modules...")
        await self._start_intelligence_modules()
        logger.info("Intelligence modules started")

        logger.info("VektorLabs fully operational")
        self._running = True

    async def _validate_binance_symbols(self) -> None:
        import aiohttp
        redis = get_redis()
        symbols = get_config().get_symbols()

        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://fapi.binance.com/fapi/v1/exchangeInfo",
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    valid_symbols = [
                        s["symbol"] for s in data.get("symbols", [])
                        if s.get("status") == "TRADING"
                    ]
                    await redis.redis.setex(
                        "binance:symbols:valid",
                        3600,
                        ",".join(valid_symbols)
                    )
                    logger.info(f"Cached {len(valid_symbols)} valid Binance symbols")

    async def _load_hmm_models(self) -> None:
        models_dir = Path(__file__).parent / "models"
        if not models_dir.exists():
            logger.warning("Models directory not found, skipping HMM load")
            return

        from core.state import get_state
        state = get_state()

        tier_models = {
            "HIGH": ["BTCUSDT", "ETHUSDT"],
            "MID": ["SOLUSDT", "BNBUSDT", "XRPUSDT"],
            "LOW": []
        }

        for tier, symbols in tier_models.items():
            for symbol in symbols:
                model_path = models_dir / f"{symbol.lower()}_hmm.npz"
                if model_path.exists():
                    logger.info(f"Found model for {symbol}")
                else:
                    logger.info(f"No dedicated model for {symbol}, using tier fallback")

        logger.info(f"HMM models ready for {len(get_config().get_symbols())} symbols")

    async def _start_ingestion(self) -> None:
        from ingestion.extract import create_extractor
        self._extractor = await create_extractor()
        logger.info("Ingestion extractor started")

    async def _start_intelligence_modules(self) -> None:
        from modules.microstructure.manager import MicrostructureManager
        from core.state import get_state
        from core.config import get_config

        config = get_config()
        state = get_state()

        self._microstructure_manager = MicrostructureManager(
            symbols=config.get_symbols(),
            redis=get_redis()
        )
        await self._microstructure_manager.start()
        self._tasks.append(asyncio.create_task(self._microstructure_manager._run()))

        logger.info("Microstructure manager started")

    async def stop(self) -> None:
        logger.info("Shutting down VektorLabs...")
        self._running = False

        for task in self._tasks:
            task.cancel()

        if self._microstructure_manager:
            await self._microstructure_manager.stop()

        if self._extractor:
            await self._extractor.stop()

        db = get_db()
        await db.close()

        redis = get_redis()
        await redis.close()

        logger.info("VektorLabs stopped")

    def is_running(self) -> bool:
        return self._running



async def main() -> None:

    _app = VektorLabs()

    def signal_handler(sig, frame):
        logger.info(f"Received signal {sig}, shutting down...")
        if _app and _app.is_running():
            asyncio.create_task(_app.stop())

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        await _app.start()
        await asyncio.Event().wait()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())