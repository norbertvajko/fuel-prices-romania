"""
Database functions for price history storage.
"""

import psycopg2
import os
import logging
from datetime import datetime

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

    # Create index for faster queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_city_timestamp 
        ON price_history(city, timestamp)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_national_timestamp 
        ON national_averages(timestamp)
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
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        saved_count = 0
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
                if cursor.rowcount > 0:
                    saved_count += 1

        conn.commit()
        conn.close()
        logger.info("Saved price history for city: %s (%d new records)", city, saved_count)
    except Exception as e:
        logger.error(f"Failed to save price history for city {city}: {e}", exc_info=True)
        if conn:
            try:
                conn.close()
            except:
                pass
        raise


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
    If a record already exists for today (same date), it will be replaced.

    Args:
        prices: Dict with fuel types as keys and average prices as values
               e.g., { "diesel": 7.50, "b95": 7.80, "b98": 8.20, "gpl": 4.50 }
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Get today's date (date only, no time)
        today = datetime.now().date()

        saved_count = 0
        for fuel_type, price in prices.items():
            if price and price != float("inf"):
                # Delete existing records for this fuel type with the same date
                cursor.execute(
                    """
                    DELETE FROM national_averages 
                    WHERE fuel_type = %s AND DATE(timestamp) = %s
                    """,
                    (fuel_type, today),
                )
                
                # Insert new record
                cursor.execute(
                    """
                    INSERT INTO national_averages (fuel_type, price, timestamp)
                    VALUES (%s, %s, CURRENT_TIMESTAMP)
                    """,
                    (fuel_type, price),
                )
                saved_count += 1

        conn.commit()
        conn.close()
        logger.info("Saved national average prices: %s (%d records)", prices, saved_count)
    except Exception as e:
        logger.error(f"Failed to save national average prices: {e}", exc_info=True)
        if conn:
            try:
                conn.close()
            except:
                pass
        raise


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
