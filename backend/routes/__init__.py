"""
Backend routes package.
"""
from .search import router as search_router
from .price_history import router as price_history_router

__all__ = ["search_router", "price_history_router"]
