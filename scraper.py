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

    def close(self):
        self.conn.close()

# ---------------- SCRAPER ---------------- #
class FuelScraper:
    def fetch(self, url: str) -> BeautifulSoup:
        r = session.get(url, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")

    def extract_date(self, soup: BeautifulSoup) -> str:
        h1 = soup.select_one("#graphPageLeft h1")
        if not h1:
            raise RuntimeError("Unable to extract date from page")
        parts = h1.get_text(strip=True).split(",")
        return parts[-1].strip() if len(parts) >= 3 else datetime.utcnow().strftime("%d-%b-%Y")

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
            "countries": {
                c: {
                    "diesel": {date: f.diesel},
                    "gasoline": {date: f.gasoline}
                } for c, f in data.items()
            }
        }
        with open(LATEST_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=4)

    @staticmethod
    def export_history(db: FuelDatabase):
        rows = db.fetch_all()
        history: Dict[str, Dict] = {}
        for country, diesel, gasoline, date in rows:
            if country not in history:
                history[country] = {"diesel": {}, "gasoline": {}}
            if diesel is not None:
                history[country]["diesel"][date] = diesel
            if gasoline is not None:
                history[country]["gasoline"][date] = gasoline
        result = {
            "lastUpdate": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "countries": history
        }
        os.makedirs(JSON_FOLDER, exist_ok=True)
        with open(ALL_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=4)
        logger.info(f"Full history JSON updated: {ALL_HISTORY_FILE}")

# ---------------- MAIN ---------------- #
def main():
    try:
        logger.info("Starting scraper")
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
        FuelExporter.export_history(db)
        db.close()
        logger.info(f"Done. Countries scraped: {len(combined)}")

    except Exception:
        logger.exception("Scraper failed")
        exit(1)

if __name__ == "__main__":
    main()