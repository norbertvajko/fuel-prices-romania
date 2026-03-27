"""
Script to run the fuel price scraper and save average prices for all major cities.
Run this script to fetch and save price data directly to the database.
"""

import asyncio
import sys
import logging
from dotenv import load_dotenv

# Load environment variables FIRST, before importing any backend modules
load_dotenv()

from backend.services.scheduler import fetch_and_save_national_average

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fuel_scraper")


async def run_scraper():
    """Run the scraper and save directly to database."""
    print("Starting fuel price scraper...")
    print("Fetching prices for all major cities...")
    
    try:
        result = await fetch_and_save_national_average()
        
        print(f"\n✓ Success!")
        print(f"  Cities updated: {result.get('cities_updated', 0)}/{result.get('total_cities', 0)}")
        
        national_avg = result.get('national_average', {})
        if national_avg:
            print(f"\n  National Average Prices:")
            for fuel, price in national_avg.items():
                print(f"    {fuel}: {price:.3f} lei")
        
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        logger.error("Scraper failed: %s", e)
        return False


if __name__ == "__main__":
    success = asyncio.run(run_scraper())
    sys.exit(0 if success else 1)
