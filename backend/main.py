"""
Main FastAPI application entry point.
"""
import logging
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .routes import search_router, price_history_router

# ----------------------------
# Logging setup
# ----------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fuel_scraper")

# ----------------------------
# FastAPI app
# ----------------------------
app = FastAPI(
    title="Fuel Price Romania API",
    description="API to fetch fuel prices in Romanian cities",
    version="1.0"
)

# ----------------------------
# CORS setup for frontend
# ----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Register routes
# ----------------------------
app.include_router(search_router, tags=["search"])
app.include_router(price_history_router, tags=["price-history"])

# ----------------------------
# Health endpoint
# ----------------------------
@app.get("/health")
def health():
    return {"ok": True}
