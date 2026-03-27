"""
Backend routes package.
"""
from .search import router as search_router
from .price_history import router as price_history_router
from .stations import router as stations_router

__all__ = ["search_router", "price_history_router", "stations_router"]
