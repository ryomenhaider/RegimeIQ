import asyncio
import inspect
import logging
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Awaitable, Callable, Optional, TypeVar

from prometheus_client import Counter, Gauge

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


CIRCUIT_OPEN = Counter(
    "circuit_breaker_open_total",
    "Total times circuit breaker opened",
    ["service"]
)
CIRCUIT_STATE = Gauge(
    "circuit_breaker_state",
    "Current state of circuit breaker (0=closed, 1=open, 2=half_open)",
    ["service"]
)


@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5
    window_seconds: int = 60
    wait_seconds: int = 30
    half_open_max_calls: int = 1


class CircuitBreakerOpen(Exception):
    pass


class CircuitBreaker:
    def __init__(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None): 
            """
            it initializes name, config(CircuitBreakerConfig), which state it is in(default: Closed),
            when it failed, when the last failure happened,  _half_open_calls, and the 
            """
            self.name = name
            self.config = config or CircuitBreakerConfig()
            self._state = CircuitState.CLOSED
            self._failure_timestamps: list[float] = []
            self._last_opened_time: Optional[float] = None
            self._half_open_calls: int = 0
            self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        return self._state

    async def call(self, func: Callable[..., Awaitable[T]], *args: Any, **kwargs: Any) -> T:
        async with self._lock:
            await self._check_state_transition()

            if self._state == CircuitState.OPEN:
                raise CircuitBreakerOpen(f"Circuit {self.name} is open")

            if self._state == CircuitState.HALF_OPEN:
                if self._half_open_calls >= self.config.half_open_max_calls:
                    raise CircuitBreakerOpen(f"Circuit {self.name} is half-open, max calls reached")
                self._half_open_calls += 1

        try:
            if inspect.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            await self._on_success()
            return result

        except Exception as e:
            await self._on_failure()
            raise

    async def _check_state_transition(self) -> None:
        if self._state == CircuitState.OPEN and self._last_opened_time:
            elapsed = time.time() - self._last_opened_time
            if elapsed >= self.config.wait_seconds:
                logger.info(f"Circuit {self.name}: transitioning OPEN -> HALF_OPEN")
                self._state = CircuitState.HALF_OPEN
                self._half_open_calls = 0
                CIRCUIT_STATE.labels(service=self.name).set(2)

    def _clean_old_failures(self) -> None:
        cutoff = time.time() - self.config.window_seconds
        self._failure_timestamps = [t for t in self._failure_timestamps if t > cutoff]

    async def _on_success(self) -> None:
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                logger.info(f"Circuit {self.name}: HALF_OPEN -> CLOSED")
                self._state = CircuitState.CLOSED
                self._failure_timestamps = []
                self._half_open_calls = 0
                CIRCUIT_STATE.labels(service=self.name).set(0)

    async def _on_failure(self) -> None:
        async with self._lock:
            now = time.time()
            self._failure_timestamps.append(now)
            self._clean_old_failures()

            if self._state == CircuitState.HALF_OPEN:
                logger.warning(f"Circuit {self.name}: HALF_OPEN -> OPEN (test call failed)")
                self._state = CircuitState.OPEN
                self._last_opened_time = now
                CIRCUIT_OPEN.labels(service=self.name).inc()
                CIRCUIT_STATE.labels(service=self.name).set(1)

            elif self._state == CircuitState.CLOSED:
                if len(self._failure_timestamps) >= self.config.failure_threshold:
                    logger.warning(
                        f"Circuit {self.name}: CLOSED -> OPEN "
                        f"(failures: {len(self._failure_timestamps)}/{self.config.failure_threshold})"
                    )
                    self._state = CircuitState.OPEN
                    self._last_opened_time = now
                    CIRCUIT_OPEN.labels(service=self.name).inc()
                    CIRCUIT_STATE.labels(service=self.name).set(1)


_circuit_breakers: dict[str, CircuitBreaker] = {}


def get_circuit_breaker(
    name: str,
    config: Optional[CircuitBreakerConfig] = None
) -> CircuitBreaker:
    if name not in _circuit_breakers:
        _circuit_breakers[name] = CircuitBreaker(name, config)
    else:
        existing = _circuit_breakers[name]
        if config is not None and existing.config != config:
            logger.warning(
                f"Circuit breaker '{name}' already exists with different config. "
                f"Existing: {existing.config}, passed: {config}. Using existing."
            )
    return _circuit_breakers[name]


async def protected_call(
    circuit_name: str,
    func: Callable[..., Awaitable[T]],
    *args: Any,
    **kwargs: Any
) -> T:
    cb = get_circuit_breaker(circuit_name)
    return await cb.call(func, *args, **kwargs)