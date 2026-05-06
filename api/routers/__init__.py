"""API routers."""

from api.routers.auth import router as auth_router
from api.routers.users import router as users_router
from api.routers.symbols import router as symbols_router
from api.routers.regime import router as regime_router
from api.routers.microstructure import router as microstructure_router
from api.routers.altdata import router as altdata_router
from api.routers.insights import router as insights_router
from api.routers.backtest import router as backtest_router
from api.routers.payment import router as payment_router
from api.routers.admin import router as admin_router
from api.routers.health import router as health_router

__all__ = [
    "auth_router",
    "users_router",
    "symbols_router",
    "regime_router",
    "microstructure_router",
    "altdata_router",
    "insights_router",
    "backtest_router",
    "payment_router",
    "admin_router",
    "health_router",
]