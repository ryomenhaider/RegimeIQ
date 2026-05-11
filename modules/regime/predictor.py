import asyncio
import json
import logging
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np

from core.database import Database
from core.redis_bus import RedisBus
from core.state import AppState, get_state
from modules.regime.features import MicrostructureOutput, RegimeFeatures
from modules.regime.models import REGIME_LABELS
from modules.regime.models import RegimeOutput

logger = logging.getLogger(__name__)

CONSUMER_GROUP = "regime-predictor"
TRANSITION_WARNING_THRESHOLD = 0.2
BASELINE_SPREAD = 0.0001
KYLE_LAMBDA_WINDOW = 90
DEFAULT_TIER = "fallback"

class RegimePredictor:

    def __init__(
        self,
        symbol: str,
        redis_bus: RedisBus,
        database: Database,
        config: dict[str, Any],
        state: AppState,
    ) -> None:
        self.symbol = symbol.upper()
        self.redis = redis_bus
        self.db = database
        self.config = config
        self.state = state

        self._features = RegimeFeatures()
        self._running = False

        self._model = state.get_model(symbol)
        self._model_tier = DEFAULT_TIER
        self._model_reliable = False

        self._current_regime: Optional[str] = None
        self._regime_change_timestamp: Optional[float] = None
        self._current_timestamp: int = 0

        self._ofi_ma10_history: deque = deque(maxlen=50)
        self._kyle_lambda_history: deque = deque(maxlen=KYLE_LAMBDA_WINDOW)
        self._trade_intensity_history: deque = deque(maxlen=50)
        self._depth_imbalance_history: deque = deque(maxlen=50)
        self._spread_history: deque = deque(maxlen=50)

    @property
    def _stream_key(self) -> str:
        return f"microstructure:{self.symbol}"

    @property
    def _output_stream_key(self) -> str:
        return f"regime:{self.symbol}"

    @property
    def _consumer_name(self) -> str:
        return f"predictor-{self.symbol.lower()}"

    async def run(self) -> None:
        """Main inference loop - subscribes to microstructure stream."""
        if self._running:
            logger.warning(f"Predictor for {self.symbol} already running")
            return

        self._load_model()

        self._running = True
        logger.info(f"RegimePredictor started for {self.symbol}")

        try:
            await self._setup_consumer_group()
            await self._consume_loop()
        except asyncio.CancelledError:
            logger.info(f"RegimePredictor for {self.symbol} cancelled")
        except Exception as e:
            logger.error(f"Predictor error for {self.symbol}: {e}")
        finally:
            self._running = False
            logger.info(f"RegimePredictor for {self.symbol} stopped")

    def _load_model(self) -> None:
        """Load model from state and determine tier/reliability."""
        model = self.state.get_model(self.symbol)

        if model is not None:
            self._model = model
            self._model_tier = model.tier if hasattr(model, 'tier') else DEFAULT_TIER
            self._model_reliable = model.is_reliable() if hasattr(model, 'is_reliable') else False
        else:
            self._model = None
            self._model_tier = DEFAULT_TIER
            self._model_reliable = False

        logger.info(
            f"Model loaded for {self.symbol}: tier={self._model_tier}, "
            f"reliable={self._model_reliable}"
        )

    async def _setup_consumer_group(self) -> None:
        """Create consumer group for the microstructure stream."""
        try:
            await self.redis.redis.xgroup_create(
                self._stream_key,
                CONSUMER_GROUP,
                id="0",
                mkstream=True
            )
            logger.debug(f"Created consumer group for {self._stream_key}")
        except Exception as e:
            if "BUSYGROUP" not in str(e):
                raise
            logger.debug(f"Consumer group already exists for {self._stream_key}")

    async def _consume_loop(self) -> None:
        """Consume messages from microstructure stream."""
        while self._running:
            try:
                messages = await self.redis.redis.xreadgroup(
                    CONSUMER_GROUP,
                    self._consumer_name,
                    {self._stream_key: ">"},
                    count=1,
                    block=5000
                )

                if not messages:
                    continue

                for stream_name, stream_messages in messages:
                    for msg_id, fields in stream_messages:
                        await self._process_message(msg_id, fields)
                        await self.redis.redis.xack(
                            self._stream_key,
                            CONSUMER_GROUP,
                            msg_id
                        )

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Consume loop error for {self.symbol}: {e}")
                await asyncio.sleep(1)

    async def _process_message(self, msg_id: str, fields: dict[str, str]) -> None:
        """Process a single microstructure message."""
        try:
            data = fields.get("data", "{}")
            if isinstance(data, str):
                import json
                data = json.loads(data)

            output = self._parse_microstructure(data)
            if output is None:
                return

            self._current_timestamp = output.timestamp

            await self._update_rolling_history(output)

            feature_vector = self._features.update(output)

            if not self._features.is_ready():
                return

            if self._model_reliable and self._model is not None:
                await self._run_model_inference(feature_vector, output)
            else:
                await self._run_fallback(output)

        except Exception as e:
            logger.error(f"Process message error for {self.symbol}: {e}")

    def _parse_microstructure(self, data: dict[str, Any]) -> Optional[MicrostructureOutput]:
        """Parse raw dict into MicrostructureOutput dataclass."""
        try:
            return MicrostructureOutput(
                symbol=data.get("symbol", self.symbol),
                timestamp=data.get("timestamp", 0),
                ofi=float(data.get("ofi", 0.0)),
                ofi_ma_10=float(data.get("ofi_ma_10", 0.0)),
                vpin=float(data.get("vpin", 0.0)),
                kyle_lambda=data.get("kyle_lambda"),
                spread=data.get("spread"),
                mid_price=data.get("mid_price"),
                bid_pressure=float(data.get("bid_pressure", 0.0)),
                ask_pressure=float(data.get("ask_pressure", 0.0)),
            )
        except Exception as e:
            logger.error(f"Parse error for {self.symbol}: {e}")
            return None

    async def _update_rolling_history(self, output: MicrostructureOutput) -> None:
        """Update rolling history deques for fallback logic."""
        self._ofi_ma10_history.append(output.ofi_ma_10)

        if output.kyle_lambda is not None:
            self._kyle_lambda_history.append(output.kyle_lambda)

        if output.spread is not None:
            self._spread_history.append(output.spread)

        self._trade_intensity_history.append(output.vpin)
        self._depth_imbalance_history.append(0.0)

    def _rolling_std(self, history: deque) -> float:
        """Compute rolling standard deviation."""
        if len(history) < 2:
            return 0.0
        arr = np.array(history)
        return float(np.std(arr))

    def _rolling_90th_percentile(self, history: deque) -> float:
        """Compute rolling 90th percentile."""
        if len(history) < 10:
            return float('inf')
        arr = np.array(history)
        return float(np.percentile(arr, 90))

    async def _run_model_inference(
        self,
        feature_vector: np.ndarray,
        output: MicrostructureOutput
    ) -> None:
        """Run HMM model inference."""
        try:
            features_2d = feature_vector.reshape(1, -1).tolist()

            result = self._model.predict_proba(features_2d)
            posterior = np.array([[
                result.transition_probabilities.get(REGIME_LABELS.get(i, ""), 0.25)
                for i in range(4)
            ]])

            regime_idx = int(posterior[0].argmax())
            confidence = float(posterior[0].max())
            regime = REGIME_LABELS.get(regime_idx, "mean_reverting")

            prev_regime = self._current_regime
            self._current_regime = regime
            self._current_timestamp = output.timestamp

            if prev_regime != regime:
                self._regime_change_timestamp = time.time()
                logger.info(
                    f"Regime change for {self.symbol}: {prev_regime} -> {regime} "
                    f"(confidence={confidence:.3f})"
                )

            time_in_regime = 0
            if self._regime_change_timestamp:
                time_in_regime = int(time.time() - self._regime_change_timestamp)

            transition_probs = result.transition_probabilities

            transition_warning = False
            if result.transition_probs:
                current_prob = transition_probs.get(regime, 0.0)
                for label, prob in transition_probs.items():
                    if label != regime and prob > TRANSITION_WARNING_THRESHOLD:
                        transition_warning = True
                        break

            regime_output = RegimeOutput(
                symbol=self.symbol,
                timestamp=output.timestamp,
                regime=regime,
                confidence=confidence,
                transition_probabilities=transition_probs,
                time_in_regime_seconds=time_in_regime,
                transition_warning=transition_warning,
                model_tier=self._model_tier,
                model_reliable=self._model_reliable,
            )

            await self._publish(regime_output)

        except Exception as e:
            logger.error(f"Model inference error for {self.symbol}: {e}")
            await self._run_fallback(output)

    async def _run_fallback(self, output: MicrostructureOutput) -> None:
        """Run rule-based fallback classification."""
        trade_intensity = float(output.vpin)
        spread = float(output.spread) if output.spread else 0.0
        vpin = float(output.vpin)
        kyle_lambda = float(output.kyle_lambda) if output.kyle_lambda else 0.0
        ofi_ma_10 = float(output.ofi_ma_10)
        depth_imbalance = 0.0

        baseline_spread = self.config.get("baseline_spread", {}).get(self.symbol, BASELINE_SPREAD)
        baseline_spread = float(baseline_spread)

        rule_illiquid = (
            trade_intensity < 0.5 or
            spread > 5 * baseline_spread
        )

        kyle_90th = self._rolling_90th_percentile(self._kyle_lambda_history)
        rule_volatile = (
            vpin > 0.7 and
            kyle_lambda > kyle_90th
        )

        ofi_std = self._rolling_std(self._ofi_ma10_history)
        rule_trending = (
            abs(ofi_ma_10) > 2 * ofi_std and
            depth_imbalance > 0.3
        )

        if rule_illiquid:
            regime = "illiquid"
        elif rule_volatile:
            regime = "volatile"
        elif rule_trending:
            regime = "trending"
        else:
            regime = "mean_reverting"

        confidence = 0.0

        prev_regime = self._current_regime
        self._current_regime = regime
        self._current_timestamp = output.timestamp

        if prev_regime != regime:
            self._regime_change_timestamp = time.time()
            logger.info(f"Regime fallback for {self.symbol}: {prev_regime} -> {regime}")

        time_in_regime = 0
        if self._regime_change_timestamp:
            time_in_regime = int(time.time() - self._regime_change_timestamp)

        transition_probs = {
            "trending": 0.25,
            "mean_reverting": 0.25,
            "volatile": 0.25,
            "illiquid": 0.25
        }

        regime_output = RegimeOutput(
            symbol=self.symbol,
            timestamp=output.timestamp,
            regime=regime,
            confidence=confidence,
            transition_probabilities=transition_probs,
            time_in_regime_seconds=time_in_regime,
            transition_warning=False,
            model_tier=self._model_tier,
            model_reliable=self._model_reliable,
        )

        await self._publish(regime_output)

    async def _publish(self, output: RegimeOutput) -> None:
        """Publish regime output to Redis stream."""
        ts = datetime.now(timezone.utc)

        message = {
            "type": "regime_update",
            "symbol": output.symbol,
            "regime": output.regime,
            "confidence": output.confidence,
            "transition_probabilities": output.transition_probabilities,
            "time_in_regime_seconds": output.time_in_regime_seconds,
            "transition_warning": output.transition_warning,
            "model_tier": output.model_tier,
            "model_reliable": output.model_reliable,
            "timestamp": ts.isoformat(),
        }

        import json
        await self.redis.redis.xadd(
            self._output_stream_key,
            {"data": json.dumps(message)},
            maxlen=1000,
            approximate=True
        )

        logger.debug(
            f"Published regime for {self.symbol}: {output.regime} "
            f"(conf={output.confidence:.3f})"
        )

        asyncio.create_task(self._write_to_db(output, ts))

    async def _write_to_db(self, output: RegimeOutput, timestamp: datetime) -> None:
        """Write regime output to TimescaleDB."""
        try:
            import json
            await self.db.execute(
                """
                INSERT INTO regime_states (
                    symbol, timestamp, regime, confidence,
                    transition_probs, vpin, kyle_lambda, spread, depth_imbalance
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                output.symbol,
                timestamp,
                output.regime,
                output.confidence,
                json.dumps(output.transition_probabilities),
                None,
                None,
                None,
                None,
            )
        except Exception as e:
            logger.error(f"DB write error for {self.symbol}: {e}")

    async def stop(self) -> None:
        """Stop the predictor."""
        self._running = False
        logger.info(f"RegimePredictor for {self.symbol} stop requested")