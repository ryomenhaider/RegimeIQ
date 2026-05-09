"""Service factory - provides lazily-initialized services with DB/Redis injected."""
import logging
from dataclasses import dataclass
from core.database import Database
from core.redis_bus import RedisBus
from api.services.auth import AuthService
from api.services.users import UsersService
from api.services.symbols import SymbolsService
from api.services.admin import AdminService
from api.services.backtest import BacktestService
from api.services.payment import PaymentService
from api.services.regime import RegimeService
from api.services.microstructure import MicrostructureService
from api.services.altdata import AltDataService
from api.services.insights import InsightsService
from api.services.websocket import WebSocketManager

logger = logging.getLogger("api.services.factory")
@dataclass
class Services:
    auth: AuthService
    users: UsersService
    symbols: SymbolsService
    admin: AdminService
    backtest: BacktestService
    payment: PaymentService
    regime: RegimeService
    microstructure: MicrostructureService
    altdata: AltDataService
    insights: InsightsService
    ws_manager: WebSocketManager | None = None


_services: Services | None = None


def init_services(db: Database, redis: RedisBus | None) -> Services:
    """Initialize all services with DB and Redis. Call once in lifespan."""
    global _services
    ws_manager = WebSocketManager(db, redis)
    _services = Services(
        auth=AuthService(db, redis),
        users=UsersService(db, redis),
        symbols=SymbolsService(db, redis),
        admin=AdminService(db, redis),
        backtest=BacktestService(db, redis),
        payment=PaymentService(db, redis),
        regime=RegimeService(db, redis),
        microstructure=MicrostructureService(db, redis),
        altdata=AltDataService(db, redis),
        insights=InsightsService(db, redis),
        ws_manager=ws_manager,
    )
    return _services


def get_services() -> Services:
    if _services is None:
        raise RuntimeError("Services not initialized. Call init_services() in app lifespan first.")
    return _services