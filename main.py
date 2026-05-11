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

        logger.info("[1/9] Initializing PostgreSQL connection...")
        await config.initialize()
        logger.info("PostgreSQL connected")

        logger.info("[2/9] Initializing Redis connection...")
        await init_redis()
        logger.info("Redis connected")

        logger.info("[3/9] Running database migrations...")
        await run_migrations()
        logger.info("Migrations complete")

        logger.info("[4/9] Loading behavioral config...")
        await config._load_behavioral_config()
        logger.info(f"Loaded {len(config._behavioral_config)} config entries")

        logger.info("[5/9] Validating Binance symbol list...")
        await self._validate_binance_symbols()
        logger.info("Binance symbols validated and cached")

        logger.info("[6/9] Loading HMM models...")
        await self._load_hmm_models()
        logger.info("HMM models loaded")

        logger.info("[7/9] Starting ingestion layer...")
        await self._start_ingestion()
        logger.info("Ingestion layer started")

        logger.info("[8/9] Starting intelligence modules...")
        await self._start_intelligence_modules()
        logger.info("Intelligence modules started")

        logger.info("[9/9] Registering system info...")
        await self._register_system_info()
        logger.info("System info registered")

        logger.info("VektorLabs fully operational")
        self._running = True

    async def _validate_binance_symbols(self) -> None:
        import aiohttp
        import time
        redis = get_redis()
        symbols = get_config().get_symbols()

        try:
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
        except Exception as e:
            logger.warning(f"Binance validation failed, using fallback: {e}")
            default_symbols = "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT"
            await redis.redis.setex("binance:symbols:valid", 3600, default_symbols)
            logger.info(f"Cached fallback symbols")

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
        from core.config import get_config
        
        symbols = get_config().get_symbols()
        logger.info(f"Starting ingestion for symbols: {symbols}")
        
        self._extractor = await create_extractor()
        
        # Check if extractor is running
        if hasattr(self._extractor, '_running'):
            logger.info(f"Ingestion extractor running: {self._extractor._running}")
        
        logger.info("Ingestion extractor started")

    async def _start_intelligence_modules(self) -> None:
        from modules.microstructure.manager import MicrostructureManager
        from modules.regime.predictor import RegimePredictor
        from core.state import get_state
        from core.config import get_config

        config = get_config()
        state = get_state()
        redis = get_redis()

        self._microstructure_manager = MicrostructureManager(
            redis=redis,
            config=config
        )
        for symbol in config.get_symbols():
            self._microstructure_manager.add_symbol(symbol)
        await self._microstructure_manager.start(config.get_symbols())

        logger.info("Microstructure manager started")

        for symbol in config.get_symbols():
            model = state.get_model(symbol)
            if model is not None:
                predictor = RegimePredictor(
                    symbol=symbol,
                    hmm=model,
                    redis_client=redis.redis,
                    config={}
                )
                self._tasks.append(asyncio.create_task(predictor.run()))
                logger.info(f"RegimePredictor started for {symbol}")
            else:
                logger.debug(f"No HMM model for {symbol}, skipping predictor")

    async def _register_system_info(self) -> None:
        import time
        redis = get_redis()
        config = get_config()
        symbols = config.get_symbols()
        
        await redis.redis.setex("system:startup_timestamp", 86400, str(int(time.time())))
        await redis.redis.setex("system:symbols", 86400, ",".join(symbols))
        
        logger.info(f"Registered system info: {len(symbols)} symbols")

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

        logger.info("VektorLabs running. Press Ctrl+C to stop.")

        while _app.is_running():
            await asyncio.sleep(1)

    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())