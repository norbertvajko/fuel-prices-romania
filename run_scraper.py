"""
Script to run the fuel price scraper and save average prices for all major cities.
Run this script to fetch and save price data to the database.
"""
import requests
import sys

# Configuration
API_BASE_URL = "https://fuel-prices-romania.onrender.com"
UPDATE_ALL_ENDPOINT = f"{API_BASE_URL}/price-history/update-all"


def run_scraper():
    """Call the API endpoint to update all city prices."""
    print("Starting fuel price scraper...")
    print(f"Calling endpoint: {UPDATE_ALL_ENDPOINT}")
    
    try:
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
        print("✗ Error: Could not connect to the API server.")
        print("  Make sure the backend is running (python app.py)")
        return False
    except requests.exceptions.Timeout:
        print("✗ Error: Request timed out.")
        return False
    except requests.exceptions.HTTPError as e:
        print(f"✗ Error: HTTP {e.response.status_code}")
        print(f"  Response: {e.response.text}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


if __name__ == "__main__":
    success = run_scraper()
    sys.exit(0 if success else 1)