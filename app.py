# app.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import logging
import math

# ----------------------------
# Logging setup
# ----------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fuel_scraper")

# ----------------------------
# FastAPI app
# ----------------------------
app = FastAPI(title="Fuel Price Romania API", description="API to fetch fuel prices in Romanian cities", version="1.0")

# ----------------------------
# CORS setup for frontend
# ----------------------------
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://fuel-prices-romania.onrender.com",
    "https://romaniapetrolprices.netlify.app/,"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Constants
# ----------------------------
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
}

BASE_URL = "https://monitorulpreturilor.info/pmonsvc/Gas"

# Product IDs to fetch
FUEL_PRODUCT_IDS = [11, 12, 21, 22, 31, 41]

# ----------------------------
# Helper functions
# ----------------------------
async def reverse_geocode(lat: float, lon: float) -> str:
    """Reverse geocode coordinates to city name using Nominatim."""
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers={"User-Agent": "FuelScraper/1.0"})
        resp.raise_for_status()
        data = resp.json()
        address = data.get("address", {})
        # Try to get city, town, or village
        city = address.get("city") or address.get("town") or address.get("village") or address.get("county")
        return city


import re

async def geocode_address(address: str) -> tuple[float, float] | None:
    """Geocode an address to lat/lon coordinates using Nominatim."""
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
    """Calculate distance between two coordinates in km using Haversine formula."""
    R = 6371  # Earth's radius in km
    dLat = (lat2 - lat1) * math.pi / 180
    dLon = (lon2 - lon1) * math.pi / 180
    a = math.sin(dLat / 2) * math.sin(dLat / 2) + \
        math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) * \
        math.sin(dLon / 2) * math.sin(dLon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


async def get_uat_id(city: str) -> str:
    """Fetch the UAT ID for a city."""
    url = f"{BASE_URL}/GetUATByName?uatname={city}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("Items", [])
        if not items:
            raise ValueError(f"No UAT found for city '{city}'")
        uat_id = items[0].get("id")
        if not uat_id:
            raise ValueError(f"No ID in UAT data for '{city}'")
        return str(uat_id)


async def get_prices_by_product(uat_id: str, product_id: int) -> dict:
    """Fetch fuel prices for a specific product ID by UAT ID."""
    url = f"{BASE_URL}/GetGasItemsByUat?UatId={uat_id}&CSVGasCatalogProductIds={product_id}&OrderBy=dist"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, dict) else {}


async def get_prices_by_uat(uat_id: str, product_ids: list = None) -> dict:
    """Fetch fuel prices by UAT ID for specified product types."""
    
    if product_ids is None:
        product_ids = FUEL_PRODUCT_IDS
    
    # Fetch prices for each product ID
    all_data = []
    for product_id in product_ids:
        try:
            data = await get_prices_by_product(uat_id, product_id)
            all_data.append(data)
        except Exception as e:
            logger.warning("Failed to fetch prices for product ID %d: %s", product_id, e)
    
    # Combine all stations from all responses (merge by station ID)
    station_map = {}
    combined_products = []
    combined_services = []
    
    for data in all_data:
        stations = data.get("Stations", [])
        products = data.get("Products", [])
        services = data.get("services", [])
        
        # Merge stations by ID
        for station in stations:
            station_id = station.get("id")
            if station_id:
                if station_id not in station_map:
                    station_map[station_id] = station
                # Merge other fields if needed
        
        # Add products and services
        combined_products.extend(products)
        combined_services.extend(services)
    
    combined_stations = list(station_map.values())
    
    return {
        "Stations": combined_stations,
        "Products": combined_products,
        "services": combined_services
    }

# ----------------------------
# Routes
# ----------------------------
@app.get("/search")
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
    
    # Map frontend filter names to fuel names for filtering
    FUEL_FILTER_MAP = {
        "benzina": ["Benzină 95", "Benzină 98"],
        "motorina": ["Motorină standard", "Motorină premium"],
        "gpl": ["GPL"],
        "electric": ["Încărcare electrică", "Incarcare Electrica"],
    }
    
    # Always fetch all products (we'll sort by fuel type later)
    product_ids = [11, 12, 21, 22, 31, 41]
    
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
    FUEL_NAME_MAP = {
        "Benzină standard": "Benzină 95",
        "Benzină premium": "Benzină 98",
        "Motorină standard": "Motorină standard",
        "Motorină premium": "Motorină premium",
        "GPL": "GPL",
        "Încărcare electrică": "Incarcare Electrica",
        "Incarcare Electrica": "Incarcare Electrica",
        "Încărcare Electrică": "Incarcare Electrica",
        "Electric": "Incarcare Electrica",
    }
    
    # Deduplicate services by name for each station
    seen_services = set()
    
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
        # E.g., if "motorina" and "gpl" are selected, station must have at least one motorina fuel AND at least one GPL fuel
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
    
    # Log sample of first station to debug
    if stations_list:
        import json

    return JSONResponse(status_code=200, content={
        "stations": stations_list,
        "count": len(stations_list),
        "city": city
    })


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in km using Haversine formula."""
    R = 6371  # Earth's radius in km
    dLat = (lat2 - lat1) * math.pi / 180
    dLon = (lon2 - lon1) * math.pi / 180
    a = math.sin(dLat / 2) * math.sin(dLat / 2) + \
        math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) * \
        math.sin(dLon / 2) * math.sin(dLon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


async def get_uat_id(city: str) -> str:
    """Fetch the UAT ID for a city."""
    url = f"{BASE_URL}/GetUATByName?uatname={city}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("Items", [])
        if not items:
            raise ValueError(f"No UAT found for city '{city}'")
        uat_id = items[0].get("id")
        if not uat_id:
            raise ValueError(f"No ID in UAT data for '{city}'")
        return str(uat_id)


async def get_prices_by_product(uat_id: str, product_id: int) -> dict:
    """Fetch fuel prices for a specific product ID by UAT ID."""
    url = f"{BASE_URL}/GetGasItemsByUat?UatId={uat_id}&CSVGasCatalogProductIds={product_id}&OrderBy=dist"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, dict) else {}


async def get_prices_by_uat(uat_id: str, product_ids: list = None) -> dict:
    """Fetch fuel prices by UAT ID for specified product types."""
    
    if product_ids is None:
        product_ids = FUEL_PRODUCT_IDS
    
    # Fetch prices for each product ID
    all_data = []
    for product_id in product_ids:
        try:
            data = await get_prices_by_product(uat_id, product_id)
            all_data.append(data)
        except Exception as e:
            logger.warning("Failed to fetch prices for product ID %d: %s", product_id, e)
    
    # Combine all stations from all responses (merge by station ID)
    station_map = {}
    combined_products = []
    combined_services = []
    
    for data in all_data:
        stations = data.get("Stations", [])
        products = data.get("Products", [])
        services = data.get("services", [])
        
        # Merge stations by ID
        for station in stations:
            station_id = station.get("id")
            if station_id:
                if station_id not in station_map:
                    station_map[station_id] = station
                # Merge other fields if needed
        
        # Add products and services
        combined_products.extend(products)
        combined_services.extend(services)
    
    combined_stations = list(station_map.values())
    
    return {
        "Stations": combined_stations,
        "Products": combined_products,
        "services": combined_services
    }

# ----------------------------
# Routes
# ----------------------------
@app.get("/search")
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
    
    # Map frontend filter names to fuel names for filtering
    FUEL_FILTER_MAP = {
        "benzina": ["Benzină 95", "Benzină 98"],
        "motorina": ["Motorină standard", "Motorină premium"],
        "gpl": ["GPL"],
        "electric": ["Încărcare electrică", "Incarcare Electrica"],
    }
    
    # Always fetch all products (we'll sort by fuel type later)
    product_ids = [11, 12, 21, 22, 31, 41]
    
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
    FUEL_NAME_MAP = {
        "Benzină standard": "Benzină 95",
        "Benzină premium": "Benzină 98",
        "Motorină standard": "Motorină standard",
        "Motorină premium": "Motorină premium",
        "GPL": "GPL",
        "Încărcare electrică": "Incarcare Electrica",
        "Incarcare Electrica": "Incarcare Electrica",
        "Încărcare Electrică": "Incarcare Electrica",
        "Electric": "Incarcare Electrica",
    }
    
    # Deduplicate services by name for each station
    seen_services = set()
    
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
        # E.g., if "motorina" and "gpl" are selected, station must have at least one motorina fuel AND at least one GPL fuel
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
    
    # Log sample of first station to debug
    if stations_list:
        import json

    return JSONResponse(status_code=200, content={
        "stations": stations_list,
        "count": len(stations_list),
        "city": city
    })


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in km using Haversine formula."""
    R = 6371  # Earth's radius in km
    dLat = (lat2 - lat1) * math.pi / 180
    dLon = (lon2 - lon1) * math.pi / 180
    a = math.sin(dLat / 2) * math.sin(dLat / 2) + \
        math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) * \
        math.sin(dLon / 2) * math.sin(dLon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


async def get_uat_id(city: str) -> str:
    """Fetch the UAT ID for a city."""
    url = f"{BASE_URL}/GetUATByName?uatname={city}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("Items", [])
        if not items:
            raise ValueError(f"No UAT found for city '{city}'")
        uat_id = items[0].get("id")
        if not uat_id:
            raise ValueError(f"No ID in UAT data for '{city}'")
        return str(uat_id)


async def get_prices_by_product(uat_id: str, product_id: int) -> dict:
    """Fetch fuel prices for a specific product ID by UAT ID."""
    url = f"{BASE_URL}/GetGasItemsByUat?UatId={uat_id}&CSVGasCatalogProductIds={product_id}&OrderBy=dist"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, dict) else {}


async def get_prices_by_uat(uat_id: str, product_ids: list = None) -> dict:
    """Fetch fuel prices by UAT ID for specified product types."""
    
    if product_ids is None:
        product_ids = FUEL_PRODUCT_IDS
    
    # Fetch prices for each product ID
    all_data = []
    for product_id in product_ids:
        try:
            data = await get_prices_by_product(uat_id, product_id)
            all_data.append(data)
        except Exception as e:
            logger.warning("Failed to fetch prices for product ID %d: %s", product_id, e)
    
    # Combine all stations from all responses (merge by station ID)
    station_map = {}
    combined_products = []
    combined_services = []
    
    for data in all_data:
        stations = data.get("Stations", [])
        products = data.get("Products", [])
        services = data.get("services", [])
        
        # Merge stations by ID
        for station in stations:
            station_id = station.get("id")
            if station_id:
                if station_id not in station_map:
                    station_map[station_id] = station
                # Merge other fields if needed
        
        # Add products and services
        combined_products.extend(products)
        combined_services.extend(services)
    
    combined_stations = list(station_map.values())
    
    return {
        "Stations": combined_stations,
        "Products": combined_products,
        "services": combined_services
    }

# ----------------------------
# Routes
# ----------------------------
@app.get("/search")
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
    
    # Map frontend filter names to fuel names for filtering
    FUEL_FILTER_MAP = {
        "benzina": ["Benzină 95", "Benzină 98"],
        "motorina": ["Motorină standard", "Motorină premium"],
        "gpl": ["GPL"],
        "electric": ["Încărcare electrică", "Incarcare Electrica"],
    }
    
    # Always fetch all products (we'll sort by fuel type later)
    product_ids = [11, 12, 21, 22, 31, 41]
    
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
    FUEL_NAME_MAP = {
        "Benzină standard": "Benzină 95",
        "Benzină premium": "Benzină 98",
        "Motorină standard": "Motorină standard",
        "Motorină premium": "Motorină premium",
        "GPL": "GPL",
        "Încărcare electrică": "Incarcare Electrica",
        "Incarcare Electrica": "Incarcare Electrica",
        "Încărcare Electrică": "Incarcare Electrica",
        "Electric": "Incarcare Electrica",
    }
    
    # Deduplicate services by name for each station
    seen_services = set()
    
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
        # E.g., if "motorina" and "gpl" are selected, station must have at least one motorina fuel AND at least one GPL fuel
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
    
    # Log sample of first station to debug
    if stations_list:
        import json

    return JSONResponse(status_code=200, content={
        "stations": stations_list,
        "count": len(stations_list),
        "city": city
    })