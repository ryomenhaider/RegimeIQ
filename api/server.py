"""FastAPI server for VektorLabs API."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from api.routes import microstructure, regime, altdata, insights

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan handler."""
    logger.info("Starting API server...")
    yield
    logger.info("Shutting down API server...")


app = FastAPI(
    title="VektorLabs API",
    description="Institutional-grade market intelligence API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://vektorlabs.xyz"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()}
    )


app.include_router(microstructure.router)
app.include_router(regime.router)
app.include_router(altdata.router)
app.include_router(insights.router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "vektorlabs-api"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "VektorLabs API",
        "version": "1.0.0",
        "docs": "/docs"
    }