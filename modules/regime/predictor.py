"""RegimePredictor - Real-time regime detection inference engine.

Subscribes to microstructure stream, extracts features, runs HMM inference,
and publishes regime predictions to Redis.
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Any, Optional

from modules.regime.features import RegimeFeatures
from modules.regime.models import RegimeOutput as RegimeOutputModel

logger = logging.getLogger(__name__)

REGIME_LABELS = {
    0: "trending",
    1: "mean_reverting",
    2: "volatile",
    3: "illiquid"
}

CONSUMER_GROUP = "regime-predictor"
TRANSITION_WARNING_THRESHOLD = 0.2


class RegimePredictor:
    """Real-time regime detection inference engine.

    Responsibilities:
        - Subscribe to Redis Stream `microstructure:{symbol}`
        - Extract feature vector using RegimeFeatures
        - Run HMM inference via predict_proba()
        - Determine regime, confidence, transition warning
        - Track time_in_regime
        - Publish RegimeOutput to Redis Stream `regime:{symbol}`
    """

    def __init__(
        self,
        symbol: str,
        hmm: Any,
        redis_client: Any,
        config: dict[str, Any]
    ) -> None:
        """Initialize RegimePredictor.

        Args:
            symbol: Trading symbol (e.g., "BTCUSDT")
            hmm: RegimeModel instance from core/state.py
            redis_client: Redis client for publishing
            config: Configuration dictionary
        """
        self.symbol = symbol.upper()
        self.hmm = hmm
        self.redis = redis_client
        self.config = config

        self._features = RegimeFeatures()
        self._running = False

        self._current_regime: Optional[str] = None
        self._regime_change_timestamp: Optional[float] = None
        self._last_feature_time: Optional[int] = None

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

    async def _setup_consumer_group(self) -> None:
        """Create consumer group for the microstructure stream."""
        try:
            await self.redis.xgroup_create(
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
                messages = await self.redis.xreadgroup(
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
                        await self.redis.xack(
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
            data = json.loads(fields.get("data", "{}"))

            feature_time = data.get("timestamp", 0)
            await self._update_features(data)

            model_reliable = self.hmm.is_reliable()

            if model_reliable:
                await self._run_inference(data, feature_time)
            else:
                await self._publish_unreliable(feature_time)

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for {self.symbol}: {e}")
        except Exception as e:
            logger.error(f"Process message error for {self.symbol}: {e}")

    async def _update_features(self, data: dict[str, Any]) -> None:
        """Update RegimeFeatures with new microstructure data."""
        class MicrostructureObj:
            def __init__(self, d: dict):
                self.mid_price = d.get("mid_price")
                self.ofi = d.get("ofi", 0.0)
                self.ofi_ma_10 = d.get("ofi_ma_10", 0.0)
                self.bid_pressure = d.get("bid_pressure", 0.0)
                self.ask_pressure = d.get("ask_pressure", 0.0)
                self.kyle_lambda = d.get("kyle_lambda")
                self.spread = d.get("spread")
                self.vpin = d.get("vpin", 0.0)

        obj = MicrostructureObj(data)
        self._features.update(obj)

    async def _run_inference(
        self,
        data: dict[str, Any],
        feature_time: int
    ) -> None:
        """Run HMM inference and publish results."""
        feature_vector = self._features.to_vector(
            ofi_ma_10=data.get("ofi_ma_10", 0.0),
            bid_pressure=data.get("bid_pressure", 0.0),
            ask_pressure=data.get("ask_pressure", 0.0),
            kyle_lambda=data.get("kyle_lambda"),
            spread=data.get("spread"),
            vpin=data.get("vpin", 0.0),
            ofi=data.get("ofi", 0.0)
        )

        features_2d = feature_vector.reshape(1, -1).tolist()

        posterior = self.hmm.hmm.predict_proba(features_2d)
        transition_matrix = self.hmm.hmm.transmat_

        regime_index = int(posterior[-1].argmax())
        confidence = float(posterior[-1].max())
        regime = REGIME_LABELS.get(regime_index, "unknown")

        transition_warning = self._check_transition_warning(
            regime_index, transition_matrix
        )

        prev_regime = self._current_regime
        self._current_regime = regime

        if prev_regime != regime:
            self._regime_change_timestamp = time.time()
            logger.info(
                f"Regime change for {self.symbol}: {prev_regime} -> {regime} "
                f"(confidence={confidence:.3f})"
            )

        time_in_regime = 0
        if self._regime_change_timestamp:
            time_in_regime = int(time.time() - self._regime_change_timestamp)

        state_probs = transition_matrix[regime_index].tolist()
        transition_probs_dict = {
            REGIME_LABELS[i]: state_probs[i]
            for i in range(4)
        }

        model_tier = getattr(self.hmm, 'tier', 'dedicated')
        model_reliable = self.hmm.is_reliable()

        output = {
            "type": "regime_update",
            "symbol": self.symbol,
            "regime": regime,
            "confidence": confidence,
            "transition_probabilities": transition_probs_dict,
            "time_in_regime_seconds": time_in_regime,
            "transition_warning": transition_warning,
            "model_tier": model_tier,
            "model_reliable": model_reliable,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        await self.redis.xadd(
            self._output_stream_key,
            {"data": json.dumps(output)},
            maxlen=1000,
            approximate=True
        )

        logger.debug(
            f"Published regime for {self.symbol}: {regime} "
            f"(conf={confidence:.3f}, warn={transition_warning})"
        )

    async def _publish_unreliable(self, feature_time: int) -> None:
        """Publish output indicating model is not reliable."""
        output = {
            "type": "regime_update",
            "symbol": self.symbol,
            "regime": "unknown",
            "confidence": 0.0,
            "transition_probabilities": {
                "trending": 0.25,
                "mean_reverting": 0.25,
                "volatile": 0.25,
                "illiquid": 0.25
            },
            "time_in_regime_seconds": 0,
            "transition_warning": False,
            "model_tier": getattr(self.hmm, 'tier', 'unknown'),
            "model_reliable": False,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        await self.redis.xadd(
            self._output_stream_key,
            {"data": json.dumps(output)},
            maxlen=1000,
            approximate=True
        )

        logger.debug(f"Published unreliable state for {self.symbol}")

    def _check_transition_warning(
        self,
        regime_index: int,
        transition_matrix: Any
    ) -> bool:
        """Check if any transition probability exceeds threshold.

        Args:
            regime_index: Current regime index (0-3)
            transition_matrix: HMM transition matrix

        Returns:
            True if any transition probability > 0.2
        """
        if transition_matrix is None:
            return False

        current_row = transition_matrix[regime_index]

        for i, prob in enumerate(current_row):
            if i != regime_index and prob > TRANSITION_WARNING_THRESHOLD:
                return True

        return False

    def _build_output(
        self,
        posterior: Any,
        feature_time: int
    ) -> RegimeOutputModel:
        """Build RegimeOutput from posterior probabilities.

        Note: This method is kept for compatibility but inference
        is now done inline in _run_inference for better control.

        Args:
            posterior: HMM posterior probability matrix
            feature_time: Timestamp of features

        Returns:
            RegimeOutputModel instance
        """
        regime_index = int(posterior[-1].argmax())
        confidence = float(posterior[-1].max())
        regime = REGIME_LABELS.get(regime_index, "unknown")

        return RegimeOutputModel(
            regime=regime,
            confidence=confidence,
            transition_probs=posterior[-1].tolist()
        )

    async def stop(self) -> None:
        """Stop the predictor."""
        self._running = False
        logger.info(f"RegimePredictor for {self.symbol} stop requested")