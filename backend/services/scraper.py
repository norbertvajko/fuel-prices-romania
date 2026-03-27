"""
Scraper service for fetching fuel prices from external API.
"""
import httpx
import logging
from typing import Optional

from ..config import BASE_URL, HEADERS, FUEL_PRODUCT_IDS

logger = logging.getLogger("fuel_scraper")


async def get_uat_id(city: str) -> str:
    """
    Fetch the UAT ID for a city.
    
    Args:
        city: The city name to look up
    
    Returns:
        The UAT ID as a string
    
    Raises:
        ValueError: If no UAT is found for the city
    """
    # Capitalize the first letter of the city name for case-insensitive search
    city_capitalized = city.strip().capitalize()
    url = f"{BASE_URL}/GetUATByName?uatname={city_capitalized}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("Items", [])
        if not items:
            logger.error(f"No UAT found for city '{city}'. API response: {data}")
            raise ValueError(f"No UAT found for city '{city}'")
        uat_id = items[0].get("id")
        if not uat_id:
            logger.error(f"No ID in UAT data for '{city}'. Item: {items[0]}")
            raise ValueError(f"No ID in UAT data for '{city}'")
        logger.info(f"Found UAT ID {uat_id} for city '{city}'")
        return str(uat_id)


async def get_prices_by_product(uat_id: str, product_id: int) -> dict:
    """
    Fetch fuel prices for a specific product ID by UAT ID.
    
    Args:
        uat_id: The UAT ID
        product_id: The product ID to fetch
    
    Returns:
        Dict with station data
    """
    url = f"{BASE_URL}/GetGasItemsByUat?UatId={uat_id}&CSVGasCatalogProductIds={product_id}&OrderBy=dist"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Fetched prices for UAT ID {uat_id}, product ID {product_id}. Response keys: {list(data.keys()) if isinstance(data, dict) else 'not a dict'}")
        return data if isinstance(data, dict) else {}


async def get_prices_by_uat(uat_id: str, product_ids: Optional[list] = None) -> dict:
    """
    Fetch fuel prices by UAT ID for specified product types.
    
    Args:
        uat_id: The UAT ID
        product_ids: List of product IDs to fetch (defaults to FUEL_PRODUCT_IDS)
    
    Returns:
        Dict with Stations, Products, and services
    """
    if product_ids is None:
        product_ids = FUEL_PRODUCT_IDS
    
    # Fetch prices for each product ID
    all_data = []
    for product_id in product_ids:
        try:
            data = await get_prices_by_product(uat_id, product_id)
            all_data.append(data)
        except Exception as e:
            logger.warning(f"Failed to fetch prices for UAT ID {uat_id}, product ID {product_id}: {e}")

    # Combine all stations from all responses (merge by station ID)
    station_map = {}
    combined_products = []
    combined_services = []
    
    for data in all_data:
        stations = data.get("Stations", [])
        products = data.get("Products", [])
        services = data.get("services", [])
        
        # Debug logging for services
        logger.info(f"Product ID response - Stations: {len(stations)}, Products: {len(products)}, Services: {len(services)}")
        if services:
            logger.info(f"Sample service from response: {services[0]}")
        
        # Merge stations by ID
        for station in stations:
            station_id = station.get("id")
            if station_id:
                if station_id not in station_map:
                    station_map[station_id] = station
        
        # Add products and services
        combined_products.extend(products)
        combined_services.extend(services)
    
    # Debug logging for combined services
    logger.info(f"Combined services before deduplication: {len(combined_services)}")
    
    # Deduplicate services by (station_id, service_id) to preserve association
    seen_service_station_pairs = set()
    unique_services = []
    for service in combined_services:
        service_id = service.get("id")
        station_id = service.get("stationid")
        pair_key = (station_id, service_id)
        
        if pair_key not in seen_service_station_pairs:
            seen_service_station_pairs.add(pair_key)
            unique_services.append(service)
    
    # Debug logging for unique services
    logger.info(f"Unique services after deduplication: {len(unique_services)}")
    if unique_services:
        logger.info(f"Sample unique service: {unique_services[0]}")
    
    combined_stations = list(station_map.values())
    
    return {
        "Stations": combined_stations,
        "Products": combined_products,
        "services": unique_services
    }
