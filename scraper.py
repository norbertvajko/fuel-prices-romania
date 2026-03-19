import os
import json
import sqlite3
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from concurrent.futures import ThreadPoolExecutor

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import pandas as pd  # Only for the one-time import

# ---------------- CONFIG ---------------- #
BASE_URL = "https://www.globalpetrolprices.com"
URLS = {
    "diesel": f"{BASE_URL}/diesel_prices/",
    "gasoline": f"{BASE_URL}/gasoline_prices/"
}

DB_FILE = "fuel_prices.db"
JSON_FOLDER = "history_json"
LATEST_FILE = "fuel_prices_latest.json"
ALL_HISTORY_FILE = "fuel_prices_all.json"

REQUEST_TIMEOUT = 30
MIN_EXPECTED_COUNTRIES = 100

# ---------------- LOGGING ---------------- #
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ---------------- HTTP SESSION ---------------- #
def create_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})
    retry = Retry(total=3, backoff_factor=1)
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

session = create_session()

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
        self._init_db()

    def _init_db(self):
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

    def save(self, data: Dict[str, CountryFuel], date: str):
        cursor = self.conn.cursor()
        for country, fuel in data.items():
            cursor.execute("""
                INSERT OR REPLACE INTO fuel_prices
                (country, diesel, gasoline, price_date)
                VALUES (?, ?, ?, ?)
            """, (country, fuel.diesel, fuel.gasoline, date))
        self.conn.commit()

    def fetch_all(self) -> List[Tuple]:
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT country, diesel, gasoline, price_date
            FROM fuel_prices
            ORDER BY price_date ASC
        """)
        return cursor.fetchall()

    def has_date(self, date: str) -> bool:
        cursor = self.conn.cursor()
        cursor.execute("SELECT 1 FROM fuel_prices WHERE price_date = ? LIMIT 1", (date,))
        return cursor.fetchone() is not None

    def close(self):
        self.conn.close()

# ---------------- SCRAPER ---------------- #
class FuelScraper:
    def fetch(self, url: str) -> BeautifulSoup:
        r = session.get(url, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")

    def extract_date(self, soup: BeautifulSoup) -> str | None:
        h1 = soup.select_one("#graphPageLeft h1")
        if not h1:
            return None
        parts = h1.get_text(strip=True).split(",")
        return parts[-1].strip() if len(parts) >= 3 else None

    def extract_table_prices(self, soup: BeautifulSoup) -> List[FuelPrice]:
        data: List[FuelPrice] = []
        rows = soup.select("table tbody tr")
        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 2:
                continue
            country = cols[0].get_text(strip=True).replace("*", "")
            try:
                price = float(cols[1].get_text(strip=True))
            except ValueError:
                continue
            if price <= 0:
                continue
            data.append(FuelPrice(country=country, price=price))
        if not data:
            raise RuntimeError("No valid data extracted from table")
        return data

    def scrape(self, fuel_type: str) -> Tuple[str, List[FuelPrice]]:
        soup = self.fetch(URLS[fuel_type])
        date = self.extract_date(soup)
        data = self.extract_table_prices(soup)
        logger.info(f"{fuel_type.capitalize()}: scraped {len(data)} countries")
        return date, data

# ---------------- PROCESSOR ---------------- #
class FuelProcessor:
    @staticmethod
    def combine(diesel: List[FuelPrice], gasoline: List[FuelPrice]) -> Dict[str, CountryFuel]:
        combined: Dict[str, CountryFuel] = {}
        for d in diesel:
            combined[d.country] = CountryFuel(diesel=d.price)
        for g in gasoline:
            if g.country not in combined:
                combined[g.country] = CountryFuel(gasoline=g.price)
            else:
                combined[g.country].gasoline = g.price
        return combined

    @staticmethod
    def validate(data: Dict[str, CountryFuel]):
        if len(data) < MIN_EXPECTED_COUNTRIES:
            logger.warning(f"Incomplete scrape: {len(data)} countries")

# ---------------- EXPORTER ---------------- #
class FuelExporter:
    @staticmethod
    def export_latest(data: Dict[str, CountryFuel], date: str):
        result = {
            "lastUpdate": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "priceDate": date,
            "countries": {c: {"diesel": f.diesel, "gasoline": f.gasoline} for c, f in data.items()}
        }
        with open(LATEST_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=4)

    @staticmethod
    def export_daily(data: Dict[str, CountryFuel], date: str):
        os.makedirs(JSON_FOLDER, exist_ok=True)
        safe_date = date.replace("/", "-").replace(" ", "_")
        path = os.path.join(JSON_FOLDER, f"fuel_prices_{safe_date}.json")
        FuelExporter.export_latest(data, date)
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "priceDate": date,
                "countries": {c: {"diesel": f.diesel, "gasoline": f.gasoline} for c, f in data.items()}
            }, f, indent=4)
        logger.info(f"Daily JSON saved: {path}")

    @staticmethod
    def export_history(db: FuelDatabase):
        rows = db.fetch_all()
        history: Dict[str, Dict] = {}
        for country, diesel, gasoline, d in rows:
            if country not in history:
                history[country] = {"diesel": {}, "gasoline": {}}
            if diesel is not None:
                history[country]["diesel"][d] = diesel
            if gasoline is not None:
                history[country]["gasoline"][d] = gasoline
        result = {"lastUpdate": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                  "countries": history}
        with open(ALL_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=4)
        logger.info("Historical JSON updated")

# ---------------- ONE-TIME HISTORICAL IMPORT ---------------- #
def import_worldbank_historical(db_file: str, wb_file: str):
    """
    Import historical fuel data from a World Bank CSV/Excel.
    Only run once, then you can remove this function.
    """
    if not os.path.exists(wb_file):
        logger.warning("World Bank file not found, skipping historical import")
        return

    db = FuelDatabase(db_file)
    df = pd.read_excel(wb_file)  # Or pd.read_csv for CSV

    # Example: expect columns: Country, Date, Diesel, Gasoline
    for _, row in df.iterrows():
        country = row['Country']
        date = str(row['Date']).split()[0]  # YYYY-MM-DD
        diesel = row.get('Diesel')
        gasoline = row.get('Gasoline')
        data = CountryFuel(diesel=diesel if pd.notna(diesel) else None,
                           gasoline=gasoline if pd.notna(gasoline) else None)
        db.save({country: data}, date)
    db.close()
    logger.info("Historical World Bank data imported successfully. You can now remove this import function.")

# ---------------- MAIN ---------------- #
def main():
    try:
        logger.info("Starting scraper")

        # --- ONE-TIME HISTORICAL IMPORT ---
        import_worldbank_historical(DB_FILE, "worldbank_data/global_fuel_prices.xlsx")
        # Uncomment and run once, then remove after import

        db = FuelDatabase(DB_FILE)
        scraper = FuelScraper()

        with ThreadPoolExecutor() as executor:
            futures = {fuel: executor.submit(scraper.scrape, fuel) for fuel in URLS}
            results = {fuel: f.result() for fuel, f in futures.items()}

        date = results["diesel"][0]
        combined = FuelProcessor.combine(results["diesel"][1], results["gasoline"][1])
        FuelProcessor.validate(combined)

        db.save(combined, date)
        FuelExporter.export_latest(combined, date)
        FuelExporter.export_daily(combined, date)
        FuelExporter.export_history(db)
        db.close()
        logger.info(f"Done. Countries: {len(combined)}")

    except Exception:
        logger.exception("Scraper failed")
        exit(1)

if __name__ == "__main__":
    main()