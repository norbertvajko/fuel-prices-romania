"""
Price history endpoints.
"""
import logging
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from ..database import get_price_history, clear_price_history, get_national_average_history
from ..services.scheduler import update_all_cities, fetch_and_save_national_average, get_national_trends, MAJOR_CITIES

logger = logging.getLogger("fuel_scraper")

router = APIRouter()


@router.get("/price-history")
async def get_price_history_endpoint(
    city: str = Query(..., description="Name of the city"),
    days: int = Query(30, description="Number of days to look back")
):
    """Get price history for a city for the last N days."""
    try:
        history = get_price_history(city, days)
        return {
            "city": city,
            "days": days,
            "history": history
        }
    except Exception as e:

        return JSONResponse(status_code=500, content={"error": "Failed to fetch price history"})


@router.delete("/price-history")
async def clear_price_history_endpoint():
    """Clear all price history data."""
    try:
        clear_price_history()
        return {"message": "Price history cleared successfully"}
    except Exception as e:

        return JSONResponse(status_code=500, content={"error": "Failed to clear price history"})


@router.post("/price-history/update-all")
async def update_all_cities_endpoint():
    """
    Fetch and save prices for all major cities.
    This endpoint is intended to be called by a cron job daily.
    It also calculates and saves national average prices.
    """
    try:

        result = await fetch_and_save_national_average()
        
        return {
            "message": f"Updated prices for {result['cities_updated']} cities",
            "total_cities": result['total_cities'],
            "successful": result['cities_updated'],
            "national_average": result['national_average']
        }
    except Exception as e:

        return JSONResponse(status_code=500, content={"error": f"Failed to update prices: {str(e)}"})


@router.get("/price-history/national")
async def get_national_average_endpoint(
    days: int = Query(30, description="Number of days to look back")
):
    """
    Get national average price trends for charting.
    """
    try:
        history = get_national_average_history(days)
        return {
            "days": days,
            "history": history
        }
    except ValueError as e:

        return JSONResponse(status_code=500, content={"error": str(e)})
    except Exception as e:

        error_msg = str(e)
        if "national_averages" in error_msg.lower() and "does not exist" in error_msg.lower():
            return JSONResponse(status_code=500, content={"error": "Database not initialized. Please run setup_database.py first."})
        elif "connection" in error_msg.lower() or "connect" in error_msg.lower():
            return JSONResponse(status_code=500, content={"error": "Database connection failed. Check DATABASE_URL environment variable."})
        else:
            return JSONResponse(status_code=500, content={"error": f"Failed to fetch national average history: {error_msg}"})


@router.post("/price-history/update-national")
async def update_national_average_endpoint():
    """
    Fetch and save national average prices.
    This endpoint is intended to be called by a cron job daily.
    """
    try:

        result = await fetch_and_save_national_average()
        
        return {
            "message": "National average prices updated successfully",
            "cities_updated": result['cities_updated'],
            "total_cities": result['total_cities'],
            "national_average": result['national_average']
        }
    except Exception as e:

        return JSONResponse(status_code=500, content={"error": f"Failed to update national average: {str(e)}"})