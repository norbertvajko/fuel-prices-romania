import requests
from bs4 import BeautifulSoup
import sqlite3
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from concurrent.futures import ThreadPoolExecutor
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ---------------- CONFIG ---------------- #
BASE_URL = "https://www.globalpetrolprices.com"
DIESEL_URL = f"{BASE_URL}/diesel_prices/"
GASOLINE_URL = f"{BASE_URL}/gasoline_prices/"

DB_FILE = "fuel_prices.db"
JSON_FOLDER = "history_json"
ALL_JSON_FILE = "fuel_prices_all.json"

REQUEST_TIMEOUT = 30
MIN_EXPECTED_COUNTRIES = 100

# ---------------- LOGGING ---------------- #
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ---------------- SESSION ---------------- #
session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})
retry = Retry(total=3, backoff_factor=1)
adapter = HTTPAdapter(max_retries=retry)
session.mount("http://", adapter)
session.mount("https://", adapter)

# ---------------- DATA MODELS ---------------- #
@dataclass
class FuelPrice:
    country: str
    price: float

@dataclass
class CountryFuel:
    diesel: float | None = None
    gasoline: float | None = None

# ---------------- DATABASE ---------------- #
class FuelDatabase:
    def __init__(self, db_file: str):
        self.conn = sqlite3.connect(db_file)
        self.init_db()

    def init_db(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS fuel_prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                country TEXT NOT NULL,
                diesel REAL,
                gasoline REAL,
                price_date TEXT NOT NULL,
                UNIQUE(country, price_date)
            )
        """)
        self.conn.commit()

    def save_prices(self, combined: Dict[str, CountryFuel], price_date: str):
        cursor = self.conn.cursor()
        for country, fuel in combined.items():
            cursor.execute("""
                INSERT OR IGNORE INTO fuel_prices
                (country, diesel, gasoline, price_date)
                VALUES (?, ?, ?, ?)
            """, (country, fuel.diesel, fuel.gasoline, price_date))
        self.conn.commit()

    def close(self):
        self.conn.close()

# ---------------- SCRAPER ---------------- #
class FuelScraper:
    def fetch_page(self, url: str) -> BeautifulSoup:
        r = session.get(url, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")

    def extract_price_date(self, soup: BeautifulSoup) -> str | None:
        container = soup.find("div", id="graphPageLeft")
        if not container: return None
        h1 = container.find("h1")
        if not h1: return None
        parts = h1.get_text(strip=True).split(",")
        if len(parts) >= 3: return parts[-1].strip()
        return None

    def scrape_prices(self, url: str) -> Tuple[str | None, List[FuelPrice]]:
        soup = self.fetch_page(url)
        price_date = self.extract_price_date(soup)
        countries = [a.get_text(strip=True).replace("*", "") for a in soup.select("a.graph_outside_link")]
        prices = []
        for div in soup.select("#graphic div div"):
            text = div.get_text(strip=True)
            try: prices.append(float(text))
            except ValueError: continue
        data = [FuelPrice(country=c, price=p) for c, p in zip(countries, prices)]
        return price_date, data

# ---------------- DATA PROCESSING ---------------- #
class FuelProcessor:
    @staticmethod
    def combine_prices(diesel_data: List[FuelPrice], gasoline_data: List[FuelPrice]) -> Dict[str, CountryFuel]:
        combined: Dict[str, CountryFuel] = {}
        for item in diesel_data: combined[item.country] = CountryFuel(diesel=item.price)
        for item in gasoline_data:
            if item.country not in combined: combined[item.country] = CountryFuel(gasoline=item.price)
            else: combined[item.country].gasoline = item.price
        return combined

    @staticmethod
    def validate(combined: Dict[str, CountryFuel]):
        if len(combined) < MIN_EXPECTED_COUNTRIES:
            raise RuntimeError(f"Scraped data incomplete ({len(combined)} countries)")

# ---------------- EXPORT ---------------- #
class FuelExporter:
    @staticmethod
    def export_json(combined: Dict[str, CountryFuel], price_date: str):
        # Save daily JSON
        os.makedirs(JSON_FOLDER, exist_ok=True)
        safe_date = price_date.replace("/", "-").replace(" ", "_")
        daily_file = os.path.join(JSON_FOLDER, f"fuel_prices_{safe_date}.json")
        result = {
            "lastUpdate": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "priceDate": price_date,
            "countries": {c: {"diesel": f.diesel, "gasoline": f.gasoline} for c, f in combined.items()}
        }
        with open(daily_file, "w", encoding="utf-8") as f: json.dump(result, f, indent=4)
        with open("fuel_prices_latest.json", "w", encoding="utf-8") as f: json.dump(result, f, indent=4)
        logger.info(f"Daily JSON exported: {daily_file}")

        # Update full historical JSON
        FuelExporter.export_all_history(price_date)

    @staticmethod
    def export_all_history(price_date: str):
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        # Only update if this date exists in DB
        cursor.execute("SELECT 1 FROM fuel_prices WHERE price_date = ? LIMIT 1", (price_date,))
        if cursor.fetchone() is None:
            logger.info(f"No new data for date {price_date}, skipping all-history update.")
            conn.close()
            return
        cursor.execute("SELECT country, diesel, gasoline, price_date FROM fuel_prices ORDER BY price_date ASC")
        rows = cursor.fetchall()
        conn.close()

        all_history: Dict[str, Dict[str, Dict]] = {}
        for country, diesel, gasoline, date in rows:
            if country not in all_history: all_history[country] = {}
            all_history[country][date] = {"diesel": diesel, "gasoline": gasoline}

        with open(ALL_JSON_FILE, "w", encoding="utf-8") as f: json.dump(all_history, f, indent=4)
        logger.info(f"All historical JSON updated: {ALL_JSON_FILE}")

# ---------------- MAIN ---------------- #
def main():
    logger.info("Starting fuel price scraper")
    scraper = FuelScraper()
    processor = FuelProcessor()
    exporter = FuelExporter()
    db = FuelDatabase(DB_FILE)

    # Parallel scraping
    with ThreadPoolExecutor() as executor:
        diesel_future = executor.submit(scraper.scrape_prices, DIESEL_URL)
        gasoline_future = executor.submit(scraper.scrape_prices, GASOLINE_URL)
        diesel_date, diesel_data = diesel_future.result()
        gasoline_date, gasoline_data = gasoline_future.result()

    price_date = diesel_date
    combined = processor.combine_prices(diesel_data, gasoline_data)
    processor.validate(combined)

    db.save_prices(combined, price_date)
    exporter.export_json(combined, price_date)

    db.close()
    logger.info(f"Finished. Countries scraped: {len(combined)}")

if __name__ == "__main__":
    main()