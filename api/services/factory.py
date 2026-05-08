"""Service factory - provides lazily-initialized services with DB/Redis injected."""

from dataclasses import dataclass
from core.database import Database
from core.redis_bus import RedisBus
from api.services.auth import AuthService
from api.services.users import UsersService
from api.services.symbols import SymbolsService
from api.services.admin import AdminService
from api.services.backtest import BacktestService
from api.services.payment import PaymentService


@dataclass
class Services:
    auth: AuthService
    users: UsersService
    symbols: SymbolsService
    admin: AdminService
    backtest: BacktestService
    payment: PaymentService


_services: Services | None = None


def init_services(db: Database, redis: RedisBus | None) -> Services:
    """Initialize all services with DB and Redis. Call once in lifespan."""
    global _services
    _services = Services(
        auth=AuthService(None, db, redis),
        users=UsersService(db, redis),
        symbols=SymbolsService(db, redis),
        admin=AdminService(db, redis),
        backtest=BacktestService(db, redis),
        payment=PaymentService(db, redis),
    )
    return _services


def get_services() -> Services:
    """Get the initialized services instance."""
    if _services is None:
        raise RuntimeError("Services not initialized - call init_services() in lifespan first")
    return _services