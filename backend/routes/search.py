"""
Search endpoint for fuel prices.
"""
import logging
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from ..config import FUEL_FILTER_MAP, FUEL_NAME_MAP, FUEL_PRODUCT_IDS
from ..database import save_price_history
from ..services import (
    get_uat_id,
    get_prices_by_uat,
    reverse_geocode,
    geocode_address,
    calculate_distance,
)

logger = logging.getLogger("fuel_scraper")

router = APIRouter()


@router.get("/search")
async def search_city(
    city: str = Query(None, description="Name of the city to search"),
    lat: float = Query(None, description="Latitude for nearby search"),
    lon: float = Query(None, description="Longitude for nearby search"),
    address: str = Query(None, description="Address to search (will be geocoded)"),
    fuels: str = Query(None, description="Fuel types to filter (benzina,motorina,gpl)")
):
    # Parse fuel types for sorting (always fetch all products)
    fuel_types = []
    if fuels:
        fuel_types = [f.strip().lower() for f in fuels.split(",") if f.strip()]
    
    # Always fetch all products (we'll sort by fuel type later)
    product_ids = FUEL_PRODUCT_IDS
    
    # Store original search coordinates for distance sorting
    original_lat = lat
    original_lon = lon
    
    # If address provided, geocode it to get lat/lon
    address_coords = None
    if address and not (lat and lon):
        try:
            coords = await geocode_address(address)
            if coords:
                lat, lon = coords
                original_lat, original_lon = coords
                address_coords = coords  # Store for later use
            else:
                return JSONResponse(status_code=200, content={"stations": [], "error": "Address not found"})
        except Exception as e:
            logger.warning("Geocoding failed: %s", e)
            return JSONResponse(status_code=200, content={"stations": [], "error": "Geocoding failed"})

    # If lat/lon provided but no city, reverse geocode to get city
    # BUT if this was an address search, use the geocoded city if available
    if lat and lon:
        if not city:
            # No city provided, need to reverse geocode
            try:
                city = await reverse_geocode(lat, lon)
                if not city:
                    return JSONResponse(status_code=200, content={"stations": [], "error": "Could not determine city from location"})
            except Exception as e:
                logger.warning("Reverse geocoding failed: %s", e)
                return JSONResponse(status_code=200, content={"stations": [], "error": "Reverse geocoding failed"})
        else:
            # City provided - if we also have address coordinates, verify the city matches
            # by reverse geocoding the address coordinates
            if address_coords:
                try:
                    geocoded_city = await reverse_geocode(address_coords[0], address_coords[1])
                    logger.info(f"Address geocoded to city: {geocoded_city}, requested city: {city}")
                    # Use the geocoded city for fetching (more accurate for address search)
                    if geocoded_city:
                        city = geocoded_city
                except Exception as e:
                    logger.warning(f"Failed to verify city from address: {e}")
    
    if not city:
        return JSONResponse(status_code=400, content={"error": "City or coordinates required"})
    
    # Step 1: Get UAT ID
    try:
        uat_id = await get_uat_id(city)
    except Exception as e:
        logger.warning("Failed to get UAT ID: %s", e)
        return JSONResponse(status_code=200, content={"stations": []})

    # Step 2: Get price data
    try:
        data = await get_prices_by_uat(uat_id, product_ids)
    except Exception as e:
        logger.warning("Failed to fetch prices: %s", e)
        return JSONResponse(status_code=200, content={"stations": []})

    stations = data.get("Stations", [])
    products = data.get("Products", [])
    services = data.get("services", [])

    # Step 3: Map products and services to stations
    station_map = {s.get("id"): s for s in stations if s.get("id")}
    for s in station_map.values():
        # Extract network name and logo from object if needed
        network_data = s.get("network")
        network_val = ""
        network_logo = ""
        if isinstance(network_data, dict):
            network_val = network_data.get("name", "")
            network_logo = (network_data.get("logo") or {}).get("logouri", "")
        elif isinstance(network_data, str):
            network_val = network_data
        
        # Get lat/lon from addr.location if main fields are 0
        addr_data = s.get("addr", {})
        location_data = addr_data.get("location", {})
        lat_val = s.get("lat") or location_data.get("Lat") or 0.0
        lon_val = s.get("lon") or location_data.get("Lon") or 0.0
        
        # Get address from addr.addrstring
        address_val = addr_data.get("addrstring", "")
        contact_details_val = addr_data.get("contactdetails", "")
        
        # Get contact details from addr.contactDetails (string format)
        s["contactDetails"] = contact_details_val
        
        s["name"] = s.get("name") or s.get("brand") or " Stație necunoscută"
        s["network"] = network_val or ""
        s["networkLogo"] = network_logo
        s["lat"] = lat_val
        s["lon"] = lon_val
        s["address"] = address_val
        s.setdefault("prices", [])
        s.setdefault("services", [])

    # Map fuel type names to frontend expectations
    for p in products:
        sid = p.get("stationid")
        if sid and sid in station_map:
            raw_fuel_name = (p.get("catprod") or {}).get("name", "")
            fuel_name = FUEL_NAME_MAP.get(raw_fuel_name, raw_fuel_name)
            station_map[sid]["prices"].append({
                "fuel": fuel_name,
                "price": p.get("price") or 0,
            })

    # Deduplicate services - reset seen set for each station
    station_seen_services = {sid: set() for sid in station_map.keys()}
    
    for svc in services:
        sid = svc.get("stationid")
        if sid and sid in station_map:
            svc_name = svc.get("name", "")
            # Skip if we've already added this service for this station
            if svc_name in station_seen_services[sid]:
                continue
            station_seen_services[sid].add(svc_name)
            station_map[sid]["services"].append({
                "name": svc_name,
                "logo": (svc.get("logo") or {}).get("logouri", ""),
            })

    stations_list = list(station_map.values())
    
    # Get the fuel names we're filtering for (grouped by filter type)
    # Only filter if not all 4 fuels are selected
    all_fuels = {"benzina", "motorina", "gpl", "electric"}
    filter_fuel_groups = []  # List of sets of fuel names
    
    if fuel_types and set(fuel_types) != all_fuels:
        # Only apply filter if not all fuels are selected
        for ft in fuel_types:
            if ft in FUEL_FILTER_MAP:
                filter_fuel_groups.append(set(FUEL_FILTER_MAP[ft]))
        
        # Filter stations - must have at least one fuel from EACH selected group
        def station_has_required_fuels(s):
            # Check prices (fuels) - convert to lowercase for case-insensitive comparison
            station_fuels = set(p.get("fuel", "").lower() for p in s.get("prices", []))
            # Check services (for electric charging) - convert to lowercase
            station_services = set(svc.get("name", "").lower() for svc in s.get("services", []))
            # Combine fuels and services for matching
            station_items = station_fuels | station_services
            # Convert filter to lowercase for comparison
            filter_lower = [[item.lower() for item in group] for group in filter_fuel_groups]
            # For each fuel group, station must have at least one item from that group
            return all(any(item in station_items for item in group) for group in filter_lower)
        stations_list = [s for s in stations_list if station_has_required_fuels(s)]
    
    # Sort by distance if we have coordinates
    if original_lat is not None and original_lon is not None:
        def get_station_distance(s):
            addr_data = s.get("addr", {})
            location_data = addr_data.get("location", {})
            station_lat = s.get("lat") or location_data.get("Lat") or 0.0
            station_lon = s.get("lon") or location_data.get("Lon") or 0.0
            if station_lat == 0 and station_lon == 0:
                return float('inf')
            return calculate_distance(original_lat, original_lon, station_lat, station_lon)
        stations_list.sort(key=get_station_distance)

    # Calculate average prices by fuel type and save to history
    # Use same fuel types as CityAverages: diesel, diesel_plus, b95, b98, gpl
    avg_prices = {}
    if stations_list:
        fuel_prices = {
            "diesel": [],      # Motorină standard
            "diesel_plus": [], # Motorină premium
            "b95": [],         # Benzină 95
            "b98": [],         # Benzină 98
            "gpl": []
        }

        for station in stations_list:
            for price_data in station.get("prices", []):
                fuel = price_data.get("fuel", "").lower()
                price = price_data.get("price", 0)

                if price > 0:
                    if "benzină 95" in fuel or "benzina 95" in fuel:
                        fuel_prices["b95"].append(price)
                    elif "benzină 98" in fuel or "benzina 98" in fuel:
                        fuel_prices["b98"].append(price)
                    elif "motorină premium" in fuel or "motorina premium" in fuel:
                        fuel_prices["diesel_plus"].append(price)
                    elif "motorin" in fuel:
                        fuel_prices["diesel"].append(price)
                    elif "gpl" in fuel:
                        fuel_prices["gpl"].append(price)

        for fuel, prices in fuel_prices.items():
            if prices:
                avg_prices[fuel] = sum(prices) / len(prices)

        # Save to database
        if avg_prices:
            save_price_history(city, avg_prices)

    return JSONResponse(status_code=200, content={
        "stations": stations_list,
        "count": len(stations_list),
        "city": city
    })