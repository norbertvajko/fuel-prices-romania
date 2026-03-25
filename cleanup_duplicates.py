"""
Clean up duplicate entries in the database.
Keeps only one row per fuel type per city per day (the earliest/first scrape).
Also cleans up the national_averages table.
"""
import sqlite3
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cleanup")

DB_PATH = "fuel_prices.db"


def cleanup_duplicates():
    """Delete duplicate entries, keeping only the first scrape per city/fuel/date."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get current count
    cursor.execute("SELECT COUNT(*) FROM price_history")
    before_count = cursor.fetchone()[0]
    logger.info(f"Rows before cleanup: {before_count}")
    
    # For each city + fuel_type + date combination, keep only the earliest timestamp
    cursor.execute("""
        DELETE FROM price_history
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM price_history
            GROUP BY city, fuel_type, DATE(timestamp)
        )
    """)
    
    deleted = cursor.rowcount
    conn.commit()
    
    # Get new count
    cursor.execute("SELECT COUNT(*) FROM price_history")
    after_count = cursor.fetchone()[0]
    
    logger.info(f"Deleted {deleted} duplicate rows")
    logger.info(f"Rows after cleanup: {after_count}")
    
    # Show the result per date
    cursor.execute("""
        SELECT DATE(timestamp) as date, COUNT(*) as cnt 
        FROM price_history 
        GROUP BY DATE(timestamp) 
        ORDER BY date
    """)
    logger.info("Remaining rows per date:")
    for row in cursor.fetchall():
        logger.info(f"  {row[0]}: {row[1]} rows")
    
    # Also cleanup national_averages
    cursor.execute("SELECT COUNT(*) FROM national_averages")
    nat_before = cursor.fetchone()[0]
    logger.info(f"\nNational averages before cleanup: {nat_before}")
    
    cursor.execute("""
        DELETE FROM national_averages
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM national_averages
            GROUP BY fuel_type, DATE(timestamp)
        )
    """)
    
    nat_deleted = cursor.rowcount
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM national_averages")
    nat_after = cursor.fetchone()[0]
    logger.info(f"Deleted {nat_deleted} duplicate rows")
    logger.info(f"National averages after cleanup: {nat_after}")
    
    conn.close()


def add_unique_constraint():
    """Add a unique constraint to prevent future duplicates."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if constraint already exists for price_history
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_unique_city_fuel_date'
    """)
    
    if not cursor.fetchone():
        cursor.execute("""
            CREATE UNIQUE INDEX idx_unique_city_fuel_date 
            ON price_history(city, fuel_type, DATE(timestamp))
        """)
        logger.info("Added unique constraint to prevent future duplicates")
    else:
        logger.info("Unique constraint already exists")
    
    # Check for national_averages
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_unique_fuel_date'
    """)
    
    if not cursor.fetchone():
        cursor.execute("""
            CREATE UNIQUE INDEX idx_unique_fuel_date 
            ON national_averages(fuel_type, DATE(timestamp))
        """)
        logger.info("Added unique constraint to national_averages")
    else:
        logger.info("Unique constraint already exists for national_averages")
    
    conn.close()


if __name__ == "__main__":
    cleanup_duplicates()
    add_unique_constraint()
    print("\nCleanup complete!")