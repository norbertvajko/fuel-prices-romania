"""
Script to run the fuel price scraper and save average prices for all major cities.
Run this script to fetch and save price data to the database.
"""

import requests
import sys
import time
import os

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "https://fuel-prices-romania.onrender.com")
UPDATE_ALL_ENDPOINT = f"{API_BASE_URL}/price-history/update-all"

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 20  # seconds


def run_scraper():
    """Call the API endpoint to update all city prices."""
    print("Starting fuel price scraper...")
    print(f"Calling endpoint: {UPDATE_ALL_ENDPOINT}")
    
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"\nAttempt {attempt}...")
            response = requests.post(UPDATE_ALL_ENDPOINT, timeout=300)  # 5 minute timeout
            response.raise_for_status()

            data = response.json()
            print(f"\n✓ Success!")
            print(f"  Cities updated: {data.get('successful', 0)}/{data.get('total_cities', 0)}")
            
            national_avg = data.get('national_average', {})
            if national_avg:
                print(f"\n  National Average Prices:")
                for fuel, price in national_avg.items():
                    print(f"    {fuel}: {price:.3f} lei")
            
            return True

        except requests.exceptions.ConnectionError:
            print("✗ Connection error: Could not reach the API server.")
        except requests.exceptions.Timeout:
            print("✗ Timeout error: Request took too long.")
        except requests.exceptions.HTTPError as e:
            print(f"✗ HTTP error {e.response.status_code}: {e.response.text}")
        except Exception as e:
            print(f"✗ Unexpected error: {e}")

        if attempt < MAX_RETRIES:
            print(f"Retrying in {RETRY_DELAY} seconds...")
            time.sleep(RETRY_DELAY)
        else:
            print("✗ Failed after maximum retries.")
            return False


if __name__ == "__main__":
    success = run_scraper()
    sys.exit(0 if success else 1)