"""
Scheduled job service for fetching prices for major cities.
This is used for daily cron job to create price trend data.
"""
import logging

from .scraper import get_uat_id, get_prices_by_uat
from .major_cities import MAJOR_CITIES
from ..config import FUEL_PRODUCT_IDS, FUEL_NAME_MAP
from ..database import (
    save_national_average,
    get_national_average_history,
)

logger = logging.getLogger("fuel_scraper")


async def fetch_and_save_national_average() -> dict:
    """
    Fetch prices for all major cities and calculate national average.
    This should be run daily via cron job.
    
    Returns:
        Dict with national average prices and status
    """
    
    # Fetch prices for all major cities
    city_results = []
    all_fuel_prices = {
        "diesel": [],
        "diesel_plus": [],
        "b95": [],
        "b98": [],
        "gpl": []
    }
    
    total_cities = len(MAJOR_CITIES)
    for i, city in enumerate(MAJOR_CITIES, 1):
        logger.info(f"Processing city {i}/{total_cities}: {city}")
        
        try:
            # Get UAT ID
            uat_id = await get_uat_id(city)
        except Exception as e:
            logger.error(f"Failed to get UAT ID for city '{city}': {e}")
            city_results.append({"city": city, "status": "failed", "error": f"Failed to get UAT ID: {e}"})
            continue
        
        try:
            # Get prices
            data = await get_prices_by_uat(uat_id, FUEL_PRODUCT_IDS)
        except Exception as e:
            logger.error(f"Failed to fetch prices for city '{city}' (UAT ID: {uat_id}): {e}")
            city_results.append({"city": city, "status": "failed", "error": f"Failed to fetch prices: {e}"})
            continue
        
        stations = data.get("Stations", [])
        products = data.get("Products", [])
        
        # Map products to stations
        station_map = {s.get("id"): s for s in stations if s.get("id")}
        
        # Calculate averages for this city
        fuel_prices = {
            "diesel": [],
            "diesel_plus": [],
            "b95": [],
            "b98": [],
            "gpl": []
        }
        
        # Map fuel type names and collect prices
        for p in products:
            sid = p.get("stationid")
            if sid and sid in station_map:
                raw_fuel_name = (p.get("catprod") or {}).get("name", "")
                fuel_name = FUEL_NAME_MAP.get(raw_fuel_name, raw_fuel_name)
                price = p.get("price") or 0
                
                if price > 0:
                    fuel_lower = fuel_name.lower()
                    if "benzină 95" in fuel_lower or "benzina 95" in fuel_lower:
                        fuel_prices["b95"].append(price)
                    elif "benzină 98" in fuel_lower or "benzina 98" in fuel_lower:
                        fuel_prices["b98"].append(price)
                    elif "motorină premium" in fuel_lower or "motorina premium" in fuel_lower:
                        fuel_prices["diesel_plus"].append(price)
                    elif "motorin" in fuel_lower:
                        fuel_prices["diesel"].append(price)
                    elif "gpl" in fuel_lower:
                        fuel_prices["gpl"].append(price)
        
        # Calculate city averages
        city_avg = {}
        for fuel, prices in fuel_prices.items():
            if prices:
                city_avg[fuel] = sum(prices) / len(prices)
        
        if city_avg:
            city_results.append({"city": city, "status": "success", "prices": city_avg})
            logger.info(f"✓ {city}: {len(city_avg)} fuel types averaged")
            
            # Add to national totals
            for fuel, price in city_avg.items():
                if fuel in all_fuel_prices:
                    all_fuel_prices[fuel].append(price)
        else:
            city_results.append({"city": city, "status": "no_prices", "error": "No prices found"})
            logger.warning(f"✗ {city}: No prices found")
    
    # Calculate national averages
    national_avg = {}
    for fuel, prices in all_fuel_prices.items():
        if prices:
            national_avg[fuel] = sum(prices) / len(prices)
    
    # Save national average to database
    if national_avg:
        save_national_average(national_avg)
    
    success_count = sum(1 for r in city_results if r.get("status") == "success")
    
    return {
        "status": "success",
        "cities_updated": success_count,
        "total_cities": len(MAJOR_CITIES),
        "national_average": national_avg
    }


def get_national_trends(days: int = 30) -> list:
    """
    Get national average price trends for charting.
    
    Args:
        days: Number of days to look back
        
    Returns:
        List of daily national average prices
    """
    return get_national_average_history(days)
