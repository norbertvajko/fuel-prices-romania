"""
Database migration script to add national_averages table.
This ensures the table exists for storing national average fuel prices.
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()


def migrate():
    """Add national_averages table to the database if it doesn't exist."""
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cursor = conn.cursor()

    print("Starting database migration...")
    print("Checking for national_averages table...")

    # Create national_averages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS national_averages (
            id SERIAL PRIMARY KEY,
            fuel_type TEXT NOT NULL,
            price REAL NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(fuel_type, timestamp)
        )
    """)
    print("✓ Created national_averages table")

    # Create index for faster queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_national_timestamp 
        ON national_averages(timestamp)
    """)
    print("✓ Created index on national_averages(timestamp)")

    # Create price_history table if it doesn't exist
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
    print("✓ Created price_history table")

    # Create index for price_history
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_city_timestamp 
        ON price_history(city, timestamp)
    """)
    print("✓ Created index on price_history(city, timestamp)")

    conn.commit()
    conn.close()

    print("\n✅ Migration completed successfully!")
    print("Tables verified/created:")
    print("  - national_averages (id, fuel_type, price, timestamp)")
    print("  - price_history (id, city, fuel_type, price, timestamp)")
    print("\nIndexes created for optimal query performance.")


if __name__ == "__main__":
    migrate()
