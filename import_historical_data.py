"""
Script to import historical price data from JSON file into national_averages table.
"""
import json
import os
import logging
from datetime import datetime
from backend.database import get_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("import_historical")


def import_historical_data(json_file_path: str) -> dict:
    """
    Import historical price data from JSON file into national_averages table.
    
    Args:
        json_file_path: Path to the JSON file containing historical data
        
    Returns:
        Dictionary with import statistics
    """
    # Check if file exists
    if not os.path.exists(json_file_path):
        raise FileNotFoundError(f"JSON file not found: {json_file_path}")
    
    # Load JSON data
    logger.info(f"Loading data from {json_file_path}")
    with open(json_file_path, 'r') as f:
        data = json.load(f)
    
    history = data.get('history', [])
    total_rows = len(history)
    logger.info(f"Found {total_rows} records to import")
    
    # Connect to database
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Track statistics
        imported_count = 0
        skipped_count = 0
        error_count = 0
        
        # Process each record
        for i, record in enumerate(history, 1):
            try:
                date_str = record.get('date')
                fuel_type = record.get('fuel_type')
                price = record.get('price')
                
                # Validate data
                if not date_str or not fuel_type or price is None:
                    logger.warning(f"Skipping invalid record at index {i}: {record}")
                    error_count += 1
                    continue
                
                # Convert date string to timestamp
                # The date is in format "YYYY-MM-DD", we'll use midnight as the time
                timestamp = datetime.strptime(date_str, '%Y-%m-%d')
                
                # Insert into database using INSERT ON CONFLICT DO NOTHING
                # This will skip duplicates based on the UNIQUE constraint (fuel_type, timestamp)
                cursor.execute(
                    """
                    INSERT INTO national_averages (fuel_type, price, timestamp)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (fuel_type, timestamp) DO NOTHING
                    """,
                    (fuel_type, price, timestamp)
                )
                
                if cursor.rowcount > 0:
                    imported_count += 1
                else:
                    skipped_count += 1
                
                # Log progress every 1000 records
                if i % 1000 == 0:
                    logger.info(f"Progress: {i}/{total_rows} records processed")
                    
            except Exception as e:
                logger.error(f"Error processing record at index {i}: {e}")
                error_count += 1
                continue
        
        # Commit changes
        conn.commit()
        logger.info(f"Import completed: {imported_count} imported, {skipped_count} skipped, {error_count} errors")
        
        return {
            'total_records': total_rows,
            'imported': imported_count,
            'skipped': skipped_count,
            'errors': error_count
        }
        
    except Exception as e:
        logger.error(f"Database error: {e}", exc_info=True)
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    # Import the historical data
    json_file = "romania_prices_2016_8_1_2026_03_23.json"
    
    try:
        stats = import_historical_data(json_file)
        print("\n" + "="*50)
        print("IMPORT SUMMARY")
        print("="*50)
        print(f"Total records in file: {stats['total_records']}")
        print(f"Successfully imported: {stats['imported']}")
        print(f"Skipped (duplicates): {stats['skipped']}")
        print(f"Errors: {stats['errors']}")
        print("="*50)
    except Exception as e:
        print(f"Import failed: {e}")
        exit(1)
