"""
Geocoding service for address and coordinate lookup.
"""
import httpx
import math
import logging
from typing import Optional, Tuple

logger = logging.getLogger("fuel_scraper")


async def reverse_geocode(lat: float, lon: float) -> Optional[str]:
    """
    Reverse geocode coordinates to city name using Nominatim.
    
    Args:
        lat: Latitude
        lon: Longitude
    
    Returns:
        City name or None if not found
    """
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers={"User-Agent": "FuelScraper/1.0"})
        resp.raise_for_status()
        data = resp.json()
        address = data.get("address", {})
        # Try to get city, town, or village
        city = address.get("city") or address.get("town") or address.get("village") or address.get("county")
        return city


async def geocode_address(address: str) -> Optional[Tuple[float, float]]:
    """
    Geocode an address to lat/lon coordinates using Nominatim.
    
    Args:
        address: The address to geocode
    
    Returns:
        Tuple of (lat, lon) or None if not found
    """
    # Try multiple query variations for better results
    query_variations = []
    
    # Original query with Romania appended
    if "romania" not in address.lower():
        query_variations.append(f"{address}, Romania")
    query_variations.append(address)
    
    for query in query_variations:
        url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1&countrycodes=ro&addressdetails=1"
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(url, headers={"User-Agent": "FuelScraper/1.0"})
                resp.raise_for_status()
                data = resp.json()
                if data and len(data) > 0:
                    result = data[0]
                    lat = float(result.get("lat", 0))
                    lon = float(result.get("lon", 0))
                    logger.info(f"Geocoded '{query}' to: {lat}, {lon}")
                    if lat and lon:
                        return lat, lon
            except Exception as e:
                logger.warning(f"Geocoding failed for '{query}': {e}")
    
    return None


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates in km using Haversine formula.
    
    Args:
        lat1, lon1: First coordinate
        lat2, lon2: Second coordinate
    
    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth's radius in km
    dLat = (lat2 - lat1) * math.pi / 180
    dLon = (lon2 - lon1) * math.pi / 180
    a = math.sin(dLat / 2) * math.sin(dLat / 2) + \
        math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) * \
        math.sin(dLon / 2) * math.sin(dLon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c