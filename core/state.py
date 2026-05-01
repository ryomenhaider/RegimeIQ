import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from core.config import get_config
from modules.regime.models import RegimeOutput

logger = logging.getLogger(__name__)


class Tier(Enum):
    HIGH = "high"
    MID = "mid"
    LOW = "low"

    @staticmethod
    def from_string(s: str) -> "Tier":
        return Tier(s.lower())


class RegimeModel:
    def __init__(
        self,
        tier: str,
        symbol: Optional[str],
        hmm: Any,
        trained_at: datetime,
        n_observations: int
    ):
        self.tier = tier
        self.symbol = symbol
        self.hmm = hmm
        self.trained_at = trained_at
        self.n_observations = n_observations

    def predict_proba(self, features: list[list[float]]) -> RegimeOutput:
        if not self.hmm:
            raise RuntimeError("HMM model not loaded")

        if not hasattr(self.hmm, 'n_components') or self.hmm.n_components != 4:
            raise ValueError(f"HMM must have 4 components, got {getattr(self.hmm, 'n_components', 'unknown')}")

        posterior = self.hmm.predict_proba(features)
        transition_matrix = self.hmm.transmat_

        regime_map = {0: "trending", 1: "mean_reverting", 2: "volatile", 3: "illiquid"}
        current_state = posterior[-1].argmax()
        regime = regime_map.get(current_state, "unknown")

        confidence = float(posterior[-1].max())

        state_probs = transition_matrix[current_state]

        return RegimeOutput(
            regime=regime,
            confidence=confidence,
            transition_probs=[float(p) for p in state_probs],
            vpin=None,
            kyle_lambda=None,
            spread=None,
            depth_imbalance=None
        )

    def is_reliable(self) -> bool:
        config = get_config()
        min_observations = config.get("min_model_observations", 1000)
        return self.n_observations >= min_observations


@dataclass
class ServiceHealth:
    is_healthy: bool = True
    last_check: Optional[float] = None
    error_message: Optional[str] = None


class AppState:
    def __init__(self):
        self._symbol_tasks: dict[str, asyncio.Task] = {}
        self._model_registry: dict[str, RegimeModel] = {}
        self._tier_models: dict[Tier, Optional[RegimeModel]] = {
            Tier.HIGH: None,
            Tier.MID: None,
            Tier.LOW: None
        }
        self._symbol_tier_map: dict[str, Tier] = {}
        self._service_health: dict[str, ServiceHealth] = {}
        self._startup_timestamp: Optional[float] = None
        self._config = get_config()

    @property
    def startup_timestamp(self) -> Optional[float]:
        return self._startup_timestamp

    def set_startup_timestamp(self) -> None:
        self._startup_timestamp = time.time()
        logger.info(f"Application started at {self._startup_timestamp}")

    def register_symbol_task(self, symbol: str, task: asyncio.Task) -> None:
        self._symbol_tasks[symbol.upper()] = task
        logger.debug(f"Registered task for symbol: {symbol}")

    def unregister_symbol_task(self, symbol: str) -> None:
        symbol = symbol.upper()
        if symbol in self._symbol_tasks:
            del self._symbol_tasks[symbol]
            logger.debug(f"Unregistered task for symbol: {symbol}")

    def get_symbol_task(self, symbol: str) -> Optional[asyncio.Task]:
        return self._symbol_tasks.get(symbol.upper())

    def get_all_symbols(self) -> list[str]:
        return list(self._symbol_tasks.keys())

    def cancel_all_symbol_tasks(self) -> None:
        for symbol, task in self._symbol_tasks.items():
            if not task.done():
                task.cancel()
                logger.info(f"Cancelled task for symbol: {symbol}")
        self._symbol_tasks.clear()

    def set_tier_model(self, tier: Tier, model: RegimeModel) -> None:
        self._tier_models[tier] = model
        logger.info(f"Tier model {tier.value} loaded: symbol={model.symbol}, observations={model.n_observations}")

    def get_tier_model(self, tier: Tier) -> Optional[RegimeModel]:
        return self._tier_models.get(tier)

    def register_symbol_model(self, symbol: str, model: RegimeModel) -> None:
        self._model_registry[symbol.upper()] = model
        logger.info(f"Dedicated model registered for {symbol}: observations={model.n_observations}")

    def assign_symbol_to_tier(self, symbol: str, tier: Tier) -> None:
        self._symbol_tier_map[symbol.upper()] = tier
        logger.debug(f"Symbol {symbol} assigned to {tier.value} tier")

    def _get_tier_for_symbol(self, symbol: str) -> Tier:
        symbol = symbol.upper()

        if symbol in self._symbol_tier_map:
            return self._symbol_tier_map[symbol]

        tier_assignments = self._config.get("tier_assignments", {})
        if not isinstance(tier_assignments, dict):
            return Tier.LOW

        if symbol in tier_assignments.get("high", []):
            return Tier.HIGH
        if symbol in tier_assignments.get("mid", []):
            return Tier.MID

        return Tier.LOW

    def get_model(self, symbol: str) -> Optional[RegimeModel]:
        symbol = symbol.upper()

        if symbol in self._model_registry:
            return self._model_registry[symbol]

        tier = self._get_tier_for_symbol(symbol)
        return self._tier_models.get(tier)

    def clear_symbol_model(self, symbol: str) -> None:
        symbol = symbol.upper()
        if symbol in self._model_registry:
            del self._model_registry[symbol]
            logger.info(f"Dedicated model cleared for {symbol}")

    def get_all_dedicated_models(self) -> dict[str, RegimeModel]:
        return self._model_registry.copy()

    def has_dedicated_model(self, symbol: str) -> bool:
        return symbol.upper() in self._model_registry

    def set_service_health(
        self,
        service: str,
        is_healthy: bool,
        error_message: Optional[str] = None
    ) -> None:
        self._service_health[service] = ServiceHealth(
            is_healthy=is_healthy,
            last_check=time.time(),
            error_message=error_message
        )
        logger.debug(f"Service {service} health: {is_healthy}")

    def get_service_health(self, service: str) -> ServiceHealth:
        return self._service_health.get(service, ServiceHealth())

    def is_service_healthy(self, service: str) -> bool:
        health = self._service_health.get(service)
        return health.is_healthy if health else False

    def get_all_service_health(self) -> dict[str, ServiceHealth]:
        return self._service_health.copy()

    def get_unhealthy_services(self) -> list[str]:
        return [
            service for service, health in self._service_health.items()
            if not health.is_healthy
        ]

    def reset(self) -> None:
        self.cancel_all_symbol_tasks()
        self._model_registry.clear()
        for tier in Tier:
            self._tier_models[tier] = None
        self._symbol_tier_map.clear()
        self._service_health.clear()
        logger.info("Application state reset")


_state: Optional[AppState] = None


def get_state() -> AppState:
    global _state
    if _state is None:
        _state = init_state()
    return _state


def init_state() -> AppState:
    global _state
    _state = AppState()
    _state.set_startup_timestamp()
    logger.info("Application state initialized")
    return _state