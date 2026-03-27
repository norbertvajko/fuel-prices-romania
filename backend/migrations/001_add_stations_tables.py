"""
Database migration script to add stations and station_prices tables.
This creates a self-contained fuel price system that doesn't depend on external APIs.
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()


def migrate():
    """Add stations and station_prices tables to the database."""
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cursor = conn.cursor()

    print("Starting database migration...")
    print("Adding stations and station_prices tables...")

    # Create stations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stations (
            id SERIAL PRIMARY KEY,
            city TEXT NOT NULL,
            name TEXT NOT NULL,
            network TEXT,
            address TEXT,
            lat REAL,
            lon REAL,
            scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(city, name, address)
        )
    """)
    print("✓ Created stations table")

    # Create station_prices table
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
    print("✓ Created station_prices table")

    # Create indexes for faster queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_stations_city 
        ON stations(city)
    """)
    print("✓ Created index on stations(city)")

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_station_prices_station_id 
        ON station_prices(station_id)
    """)
    print("✓ Created index on station_prices(station_id)")

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_station_prices_fuel_type 
        ON station_prices(fuel_type)
    """)
    print("✓ Created index on station_prices(fuel_type)")

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_station_prices_scraped_at 
        ON station_prices(scraped_at)
    """)
    print("✓ Created index on station_prices(scraped_at)")

    # Create composite index for common queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_station_prices_station_fuel 
        ON station_prices(station_id, fuel_type)
    """)
    print("✓ Created composite index on station_prices(station_id, fuel_type)")

    conn.commit()
    conn.close()

    print("\n✅ Migration completed successfully!")
    print("New tables added:")
    print("  - stations (id, city, name, network, address, lat, lon, scraped_at)")
    print("  - station_prices (id, station_id, fuel_type, price, scraped_at)")
    print("\nIndexes created for optimal query performance.")


if __name__ == "__main__":
    migrate()
