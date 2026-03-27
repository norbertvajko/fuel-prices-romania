"""
Database functions for price history storage.
"""

import psycopg2
import os
import logging

logger = logging.getLogger("fuel_scraper")


def get_connection():
    """Get a database connection using the DATABASE_URL environment variable."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set. Please set it in your .env file.")
    return psycopg2.connect(database_url)


def init_db() -> None:
    """Initialize the database with price history tables."""
    conn = get_connection()
    cursor = conn.cursor()

    # Create table for price history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS price_history (
            id SERIAL PRIMARY KEY,
            city TEXT NOT NULL,
            fuel_type TEXT NOT NULL,
            price REAL NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(city, fuel_type, timestamp)
        )
    """)

    # Create table for national average prices
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS national_averages (
            id SERIAL PRIMARY KEY,
            fuel_type TEXT NOT NULL,
            price REAL NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(fuel_type, timestamp)
        )
    """)

    # Create table for stations
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stations (
            id SERIAL PRIMARY KEY,
            city TEXT NOT NULL,
            name TEXT NOT NULL,
            network TEXT,
            network_logo TEXT,
            address TEXT,
            lat REAL,
            lon REAL,
            updatedate TEXT,
            services JSONB DEFAULT '[]'::jsonb,
            contact_details TEXT,
            scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(city, name, address)
        )
    """)

    # Create table for station prices
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS station_prices (
            id SERIAL PRIMARY KEY,
            station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
            fuel_type TEXT NOT NULL,
            price REAL NOT NULL,
            scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(station_id, fuel_type, scraped_at)
        )
    """)

    # Create index for faster queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_city_timestamp 
        ON price_history(city, timestamp)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_national_timestamp 
        ON national_averages(timestamp)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_stations_city 
        ON stations(city)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_station_prices_station_id 
        ON station_prices(station_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_station_prices_fuel_type 
        ON station_prices(fuel_type)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_station_prices_scraped_at 
        ON station_prices(scraped_at)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_station_prices_station_fuel 
        ON station_prices(station_id, fuel_type)
    """)

    conn.commit()
    conn.close()
    logger.info("Database initialized")


def save_price_history(city: str, prices: dict) -> None:
    """
    Save price data to history table.
    Uses INSERT ON CONFLICT DO NOTHING to keep the first scrape of the day (skips duplicates).

    Args:
        city: The city name
        prices: Dict with fuel types as keys and prices as values
               e.g., { "benzina": 7.50, "motorina": 7.80, "gpl": 4.50 }
    """
    conn = get_connection()
    cursor = conn.cursor()

    for fuel_type, price in prices.items():
        if price and price != float("inf"):
            # Use INSERT ON CONFLICT DO NOTHING to keep the first scrape of the day
            cursor.execute(
                """
                INSERT INTO price_history (city, fuel_type, price, timestamp)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (city, fuel_type, timestamp) DO NOTHING
            """,
                (city, fuel_type, price),
            )

    conn.commit()
    conn.close()
    logger.info("Saved price history for city: %s", city)


def get_price_history(city: str, days: int = 30) -> list:
    """
    Get price history for a city for the last N days.

    Args:
        city: The city name
        days: Number of days to look back (default 30)

    Returns:
        List of {date, fuel_type, price} objects
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get daily averages for each fuel type
    cursor.execute(
        """
        SELECT 
            DATE(timestamp) as date,
            fuel_type,
            AVG(price) as avg_price
        FROM price_history
        WHERE city = %s
        AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '%s days'
        GROUP BY DATE(timestamp), fuel_type
        ORDER BY date ASC
    """,
        (city, days),
    )

    results = cursor.fetchall()
    conn.close()

    # Convert to list of dicts
    history = []
    for row in results:
        history.append({"date": row[0], "fuel_type": row[1], "price": round(row[2], 2)})

    return history


def clear_price_history() -> None:
    """Clear all price history data from the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM price_history")
    conn.commit()
    conn.close()
    logger.info("Cleared all price history data")


def save_national_average(prices: dict) -> None:
    """
    Save national average prices to database.
    Uses INSERT ON CONFLICT DO NOTHING to keep the first scrape of the day.

    Args:
        prices: Dict with fuel types as keys and average prices as values
               e.g., { "diesel": 7.50, "b95": 7.80, "b98": 8.20, "gpl": 4.50 }
    """
    conn = get_connection()
    cursor = conn.cursor()

    for fuel_type, price in prices.items():
        if price and price != float("inf"):
            # Use INSERT ON CONFLICT DO NOTHING to keep the first scrape of the day
            cursor.execute(
                """
                INSERT INTO national_averages (fuel_type, price, timestamp)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (fuel_type, timestamp) DO NOTHING
            """,
                (fuel_type, price),
            )

    conn.commit()
    conn.close()
    logger.info("Saved national average prices: %s", prices)


def get_national_average_history(days: int = 30) -> list:
    """
    Get national average price history for the last N days.
    Returns the last reading from each day for each fuel type.

    Args:
        days: Number of days to look back (default 30)

    Returns:
        List of {date, fuel_type, price} objects
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # First check if the table exists
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'national_averages'
            )
        """
        )
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            logger.error("national_averages table does not exist. Run setup_database.py to initialize the database.")
            if conn:
                conn.close()
            return []

        # Get the last reading from each day for each fuel type
        cursor.execute(
            """
            SELECT 
                DATE(n.timestamp) as date,
                n.fuel_type,
                n.price
            FROM national_averages n
            INNER JOIN (
                SELECT 
                    fuel_type,
                    DATE(timestamp) as date,
                    MAX(timestamp) as max_timestamp
                FROM national_averages
                WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '%s days'
                GROUP BY fuel_type, DATE(timestamp)
            ) latest ON n.fuel_type = latest.fuel_type 
                AND n.timestamp = latest.max_timestamp
            ORDER BY date ASC
        """,
            (days,),
        )

        results = cursor.fetchall()
        conn.close()

        history = []
        for row in results:
            history.append({"date": row[0], "fuel_type": row[1], "price": round(row[2], 2)})

        return history
    except Exception as e:
        # Handle error silently
        if conn:
            try:
                conn.close()
            except:
                pass
        raise


# ============================================================================
# STATION FUNCTIONS
# ============================================================================

def save_station(city: str, name: str, network: str, network_logo: str, address: str, lat: float, lon: float, updatedate: str, services: list, contact_details: str) -> int:
    """
    Save a station to the database.
    Uses INSERT ON CONFLICT DO NOTHING to skip duplicates.

    Args:
        city: The city name
        name: Station name
        network: Fuel network (e.g., "Petrom", "OMV")
        network_logo: Network logo URL
        address: Station address
        lat: Latitude
        lon: Longitude
        updatedate: Last update date
        services: List of services
        contact_details: Contact information

    Returns:
        Station ID
    """
    import json
    conn = get_connection()
    cursor = conn.cursor()

    # Convert services list to JSON string
    services_json = json.dumps(services) if services else '[]'

    # Insert or get existing station
    cursor.execute(
        """
        INSERT INTO stations (city, name, network, network_logo, address, lat, lon, updatedate, services, contact_details, scraped_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (city, name, address) DO UPDATE SET
            network = EXCLUDED.network,
            network_logo = EXCLUDED.network_logo,
            lat = EXCLUDED.lat,
            lon = EXCLUDED.lon,
            updatedate = EXCLUDED.updatedate,
            services = EXCLUDED.services,
            contact_details = EXCLUDED.contact_details,
            scraped_at = CURRENT_TIMESTAMP
        RETURNING id
    """,
        (city, name, network, network_logo, address, lat, lon, updatedate, services_json, contact_details),
    )

    station_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()

    return station_id


def save_station_price(station_id: int, fuel_type: str, price: float) -> None:
    """
    Save a station price to the database.
    Uses INSERT ON CONFLICT DO NOTHING to skip duplicates.

    Args:
        station_id: Station ID
        fuel_type: Fuel type (e.g., "diesel", "b95")
        price: Price in lei
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO station_prices (station_id, fuel_type, price, scraped_at)
        VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (station_id, fuel_type, scraped_at) DO NOTHING
    """,
        (station_id, fuel_type, price),
    )

    conn.commit()
    conn.close()


def get_stations_by_city(city: str, limit: int = 100) -> list:
    """
    Get stations for a city from the database.

    Args:
        city: The city name
        limit: Maximum number of stations to return (default 100)

    Returns:
        List of station dicts with prices
    """
    import json
    conn = get_connection()
    cursor = conn.cursor()

    # Get stations with their latest prices for each fuel type
    cursor.execute(
        """
        SELECT 
            s.id,
            s.name,
            s.network,
            s.network_logo,
            s.address,
            s.lat,
            s.lon,
            s.updatedate,
            s.services,
            s.contact_details,
            sp.fuel_type,
            sp.price
        FROM stations s
        LEFT JOIN station_prices sp ON s.id = sp.station_id
        WHERE LOWER(s.city) = LOWER(%s)
        AND sp.scraped_at = (
            SELECT MAX(sp2.scraped_at)
            FROM station_prices sp2
            WHERE sp2.station_id = s.id AND sp2.fuel_type = sp.fuel_type
        )
        ORDER BY s.name
        LIMIT %s
    """,
        (city, limit),
    )

    results = cursor.fetchall()
    conn.close()

    # Group by station
    stations = {}
    for row in results:
        station_id = row[0]
        if station_id not in stations:
            # Parse services JSON
            services_json = row[8] if row[8] else '[]'
            try:
                services = json.loads(services_json) if isinstance(services_json, str) else services_json
            except:
                services = []
            
            stations[station_id] = {
                "id": station_id,
                "name": row[1],
                "network": row[2],
                "networkLogo": row[3],
                "address": row[4],
                "lat": row[5],
                "lon": row[6],
                "updatedate": row[7],
                "services": services,
                "contactDetails": row[9],
                "prices": [],
            }

        if row[10] and row[11]:  # fuel_type and price
            stations[station_id]["prices"].append({
                "fuel": row[10],
                "price": row[11],
            })

    return list(stations.values())


def get_station_prices_by_city(city: str, days: int = 30) -> list:
    """
    Get station prices for a city from the database.

    Args:
        city: The city name
        days: Number of days to look back (default 30)

    Returns:
        List of {date, fuel_type, price} objects
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT 
            DATE(sp.scraped_at) as date,
            sp.fuel_type,
            AVG(sp.price) as avg_price
        FROM station_prices sp
        JOIN stations s ON sp.station_id = s.id
        WHERE LOWER(s.city) = LOWER(%s)
        AND sp.scraped_at >= CURRENT_TIMESTAMP - INTERVAL '%s days'
        GROUP BY DATE(sp.scraped_at), sp.fuel_type
        ORDER BY date ASC
    """,
        (city, days),
    )

    results = cursor.fetchall()
    conn.close()

    history = []
    for row in results:
        history.append({"date": row[0], "fuel_type": row[1], "price": round(row[2], 2)})

    return history


def get_available_cities() -> list:
    """
    Get list of cities that have station data.

    Returns:
        List of city names
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT DISTINCT city
        FROM stations
        ORDER BY city
    """
    )

    results = cursor.fetchall()
    conn.close()

    return [row[0] for row in results]


def clear_old_station_data(days: int = 30) -> None:
    """
    Clear old station data to keep database clean.
    Keeps only the last N days of data.

    Args:
        days: Number of days to keep (default 30)
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Delete old station prices
    cursor.execute(
        """
        DELETE FROM station_prices
        WHERE scraped_at < CURRENT_TIMESTAMP - INTERVAL '%s days'
    """,
        (days,),
    )

    # Delete stations that have no prices
    cursor.execute(
        """
        DELETE FROM stations
        WHERE id NOT IN (
            SELECT DISTINCT station_id
            FROM station_prices
        )
    """
    )

    conn.commit()
    conn.close()
    logger.info("Cleared old station data (kept last %d days)", days)
