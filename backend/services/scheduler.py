"""
Scheduled job service for fetching prices for major cities.
This is used for daily cron job to create price trend data.
"""
import logging

from .scraper import get_uat_id, get_prices_by_uat
from .major_cities import MAJOR_CITIES
from ..config import FUEL_PRODUCT_IDS, FUEL_NAME_MAP
from ..database import (
    save_price_history,
    save_national_average,
    get_national_average_history,
    save_station,
    save_station_price,
)

logger = logging.getLogger("fuel_scraper")


async def fetch_and_save_city_prices(city: str) -> dict:
    """
    Fetch prices for a single city and save to database.
    
    Returns:
        Dict with city name and status
    """
    try:
        # Get UAT ID
        uat_id = await get_uat_id(city)
    except Exception as e:
        logger.warning(f"Failed to get UAT ID for {city}: {e}")
        return {"city": city, "status": "failed", "error": "Failed to get UAT ID"}
    
    try:
        # Get prices
        data = await get_prices_by_uat(uat_id, FUEL_PRODUCT_IDS)
    except Exception as e:
        logger.warning(f"Failed to fetch prices for {city}: {e}")
        return {"city": city, "status": "failed", "error": "Failed to fetch prices"}
    
    stations = data.get("Stations", [])
    products = data.get("Products", [])
    
    # Map products to stations (same logic as search.py)
    station_map = {s.get("id"): s for s in stations if s.get("id")}
    for s in station_map.values():
        s.setdefault("prices", [])
    
    # Map fuel type names to stations
    for p in products:
        sid = p.get("stationid")
        if sid and sid in station_map:
            raw_fuel_name = (p.get("catprod") or {}).get("name", "")
            fuel_name = FUEL_NAME_MAP.get(raw_fuel_name, raw_fuel_name)
            station_map[sid]["prices"].append({
                "fuel": fuel_name,
                "price": p.get("price") or 0,
            })
    
    # Calculate averages
    fuel_prices = {
        "diesel": [],
        "diesel_plus": [],
        "b95": [],
        "b98": [],
        "gpl": []
    }
    
    # Save station data to database
    stations_saved = 0
    for station in station_map.values():
        # Extract station info
        station_name = station.get("name") or station.get("brand") or " Stație necunoscută"
        network_data = station.get("network")
        network_val = ""
        if isinstance(network_data, dict):
            network_val = network_data.get("name", "")
        elif isinstance(network_data, str):
            network_val = network_data
        
        # Get lat/lon from addr.location if main fields are 0
        addr_data = station.get("addr", {})
        location_data = addr_data.get("location", {})
        lat_val = station.get("lat") or location_data.get("Lat") or 0.0
        lon_val = station.get("lon") or location_data.get("Lon") or 0.0
        
        # Get address from addr.addrstring
        address_val = addr_data.get("addrstring", "")
        
        # Save station to database
        try:
            station_id = save_station(
                city=city,
                name=station_name,
                network=network_val,
                address=address_val,
                lat=lat_val,
                lon=lon_val,
            )
            stations_saved += 1
            
            # Save station prices
            for price_data in station.get("prices", []):
                fuel = price_data.get("fuel", "").lower()
                price = price_data.get("price", 0)
                
                if price > 0:
                    # Map fuel name to standard type
                    fuel_type = None
                    if "benzină 95" in fuel or "benzina 95" in fuel:
                        fuel_type = "b95"
                        fuel_prices["b95"].append(price)
                    elif "benzină 98" in fuel or "benzina 98" in fuel:
                        fuel_type = "b98"
                        fuel_prices["b98"].append(price)
                    elif "motorină premium" in fuel or "motorina premium" in fuel:
                        fuel_type = "diesel_plus"
                        fuel_prices["diesel_plus"].append(price)
                    elif "motorin" in fuel:
                        fuel_type = "diesel"
                        fuel_prices["diesel"].append(price)
                    elif "gpl" in fuel:
                        fuel_type = "gpl"
                        fuel_prices["gpl"].append(price)
                    
                    # Save to database if we have a valid fuel type
                    if fuel_type:
                        save_station_price(station_id, fuel_type, price)
                        
        except Exception as e:
            logger.warning(f"Failed to save station {station_name}: {e}")
            continue
    
    # Calculate averages
    avg_prices = {}
    for fuel, prices in fuel_prices.items():
        if prices:
            avg_prices[fuel] = sum(prices) / len(prices)
    
    # Save to database
    if avg_prices:
        save_price_history(city, avg_prices)
        logger.info(f"Saved price history for {city}: {avg_prices}")
        return {
            "city": city,
            "status": "success",
            "stations_saved": stations_saved,
            "prices_saved": len(avg_prices),
            "prices": avg_prices
        }
    
    return {"city": city, "status": "no_prices", "error": "No prices found"}


async def update_all_cities() -> list:
    """
    Fetch and save prices for all major cities.
    
    Returns:
        List of results for each city
    """
    results = []
    for city in MAJOR_CITIES:
        result = await fetch_and_save_city_prices(city)
        results.append(result)
    
    return results


async def fetch_and_save_national_average() -> dict:
    """
    Fetch prices for all major cities and calculate national average.
    This should be run daily via cron job.
    
    Returns:
        Dict with national average prices and status
    """
    logger.info("Starting daily national average price calculation")
    
    # Fetch prices for all major cities
    city_results = []
    all_fuel_prices = {
        "diesel": [],
        "diesel_plus": [],
        "b95": [],
        "b98": [],
        "gpl": []
    }
    
    for city in MAJOR_CITIES:
        result = await fetch_and_save_city_prices(city)
        city_results.append(result)
        
        # Get the prices from the result
        if result.get("status") == "success":
            prices = result.get("prices", {})
            for fuel, price in prices.items():
                if fuel in all_fuel_prices:
                    all_fuel_prices[fuel].append(price)
    
    # Calculate national averages
    national_avg = {}
    for fuel, prices in all_fuel_prices.items():
        if prices:
            national_avg[fuel] = sum(prices) / len(prices)
    
    # Save national average to database
    if national_avg:
        save_national_average(national_avg)
        logger.info(f"Saved national average prices: {national_avg}")
    
    success_count = sum(1 for r in city_results if r.get("status") == "success")
    total_stations = sum(r.get("stations_saved", 0) for r in city_results if r.get("status") == "success")
    
    return {
        "status": "success",
        "cities_updated": success_count,
        "total_cities": len(MAJOR_CITIES),
        "total_stations": total_stations,
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
