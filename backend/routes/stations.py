"""
Stations endpoints for serving data from database.
This provides a self-contained API that doesn't depend on external services.
"""

import logging
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from ..database import (
    get_stations_by_city,
    get_station_prices_by_city,
    get_available_cities,
)

logger = logging.getLogger("fuel_scraper")

router = APIRouter()


@router.get("/stations")
async def get_stations_endpoint(
    city: str = Query(..., description="Name of the city"),
    limit: int = Query(100, description="Maximum number of stations to return")
):
    """
    Get stations for a city from the database.
    This endpoint serves data from the database, not from external API.
    """
    try:
        stations = get_stations_by_city(city, limit)
        return {
            "city": city,
            "stations": stations,
            "count": len(stations)
        }
    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch stations: {str(e)}"}
        )


@router.get("/stations/prices")
async def get_station_prices_endpoint(
    city: str = Query(..., description="Name of the city"),
    days: int = Query(30, description="Number of days to look back")
):
    """
    Get station prices for a city from the database.
    Returns average prices by fuel type for each day.
    """
    try:
        prices = get_station_prices_by_city(city, days)
        return {
            "city": city,
            "days": days,
            "prices": prices
        }
    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch station prices: {str(e)}"}
        )


@router.get("/cities")
async def get_cities_endpoint():
    """
    Get list of cities that have station data.
    """
    try:
        cities = get_available_cities()
        return {
            "cities": cities,
            "count": len(cities)
        }
    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch cities: {str(e)}"}
        )
