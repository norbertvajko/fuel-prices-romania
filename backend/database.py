"""
Database functions for price history storage.
"""
import sqlite3
import logging
from typing import Optional, List, Dict

from .config import DB_PATH

logger = logging.getLogger("fuel_scraper")


def init_db() -> None:
    """Initialize the database with price history tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table for price history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT NOT NULL,
            fuel_type TEXT NOT NULL,
            price REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(city, fuel_type, timestamp)
        )
    """)
    
    # Create table for national average prices
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS national_averages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fuel_type TEXT NOT NULL,
            price REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    logger.info("Database initialized at %s", DB_PATH)


def save_price_history(city: str, prices: dict) -> None:
    """
    Save price data to history table.
    
    Args:
        city: The city name
        prices: Dict with fuel types as keys and prices as values
               e.g., { "benzina": 7.50, "motorina": 7.80, "gpl": 4.50 }
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for fuel_type, price in prices.items():
        if price and price != float('inf'):
            try:
                cursor.execute("""
                    INSERT INTO price_history (city, fuel_type, price, timestamp)
                    VALUES (?, ?, ?, datetime('now'))
                """, (city, fuel_type, price))
            except sqlite3.IntegrityError:
                pass  # Skip duplicate entries
    
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
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get daily averages for each fuel type
    cursor.execute("""
        SELECT 
            DATE(timestamp) as date,
            fuel_type,
            AVG(price) as avg_price
        FROM price_history
        WHERE city = ?
        AND timestamp >= datetime('now', '-' || ? || ' days')
        GROUP BY DATE(timestamp), fuel_type
        ORDER BY date ASC
    """, (city, days))
    
    results = cursor.fetchall()
    conn.close()
    
    # Convert to list of dicts
    history = []
    for row in results:
        history.append({
            "date": row[0],
            "fuel_type": row[1],
            "price": round(row[2], 2)
        })
    
    return history


def clear_price_history() -> None:
    """Clear all price history data from the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM price_history")
    conn.commit()
    conn.close()
    logger.info("Cleared all price history data")


def save_national_average(prices: dict) -> None:
    """
    Save national average prices to database.
    
    Args:
        prices: Dict with fuel types as keys and average prices as values
               e.g., { "diesel": 7.50, "b95": 7.80, "b98": 8.20, "gpl": 4.50 }
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for fuel_type, price in prices.items():
        if price and price != float('inf'):
            try:
                cursor.execute("""
                    INSERT INTO national_averages (fuel_type, price, timestamp)
                    VALUES (?, ?, datetime('now'))
                """, (fuel_type, price))
            except sqlite3.IntegrityError:
                pass  # Skip duplicate entries
    
    conn.commit()
    conn.close()
    logger.info("Saved national average prices: %s", prices)


def get_national_average_history(days: int = 30) -> list:
    """
    Get national average price history for the last N days.
    
    Args:
        days: Number of days to look back (default 30)
    
    Returns:
        List of {date, fuel_type, price} objects
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            DATE(timestamp) as date,
            fuel_type,
            AVG(price) as avg_price
        FROM national_averages
        WHERE timestamp >= datetime('now', '-' || ? || ' days')
        GROUP BY DATE(timestamp), fuel_type
        ORDER BY date ASC
    """, (days,))
    
    results = cursor.fetchall()
    conn.close()
    
    history = []
    for row in results:
        history.append({
            "date": row[0],
            "fuel_type": row[1],
            "price": round(row[2], 2)
        })
    
    return history


# Initialize database on module import
init_db()