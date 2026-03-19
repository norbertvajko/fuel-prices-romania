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
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
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
                INSERT OR IGNORE INTO fuel_prices
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

    def extract_prices(self, soup: BeautifulSoup) -> List[float]:
        prices = []
        for div in soup.select("#graphic div div"):
            try:
                prices.append(float(div.get_text(strip=True)))
            except ValueError:
                continue
        return prices

    def extract_countries(self, soup: BeautifulSoup) -> List[str]:
        return [
            a.get_text(strip=True).replace("*", "")
            for a in soup.select("a.graph_outside_link")
        ]

    def scrape(self, fuel_type: str) -> Tuple[str, List[FuelPrice]]:
        soup = self.fetch(URLS[fuel_type])
        date = self.extract_date(soup)

        countries = self.extract_countries(soup)
        prices = self.extract_prices(soup)

        data = [
            FuelPrice(country=c, price=p)
            for c, p in zip(countries, prices)
        ]

        return date, data


# ---------------- PROCESSOR ---------------- #
class FuelProcessor:
    @staticmethod
    def combine(
        diesel: List[FuelPrice],
        gasoline: List[FuelPrice]
    ) -> Dict[str, CountryFuel]:

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
            raise RuntimeError(f"Incomplete scrape: {len(data)} countries")


# ---------------- EXPORTER ---------------- #
class FuelExporter:

    @staticmethod
    def export_latest(data: Dict[str, CountryFuel], date: str):
        result = {
            "lastUpdate": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "priceDate": date,
            "countries": {
                c: {"diesel": f.diesel, "gasoline": f.gasoline}
                for c, f in data.items()
            }
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
                "countries": {
                    c: {"diesel": f.diesel, "gasoline": f.gasoline}
                    for c, f in data.items()
                }
            }, f, indent=4)

        logger.info(f"Daily JSON saved: {path}")

    @staticmethod
    def export_history(db: FuelDatabase, date: str):
        if not db.has_date(date):
            logger.info(f"No new data for {date}, skipping history export")
            return

        rows = db.fetch_all()

        history: Dict[str, Dict] = {}

        for country, diesel, gasoline, d in rows:
            if country not in history:
                history[country] = {
                    "diesel": {},
                    "gasoline": {}
                }

            if diesel is not None:
                history[country]["diesel"][d] = diesel

            if gasoline is not None:
                history[country]["gasoline"][d] = gasoline

        result = {
            "lastUpdate": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "countries": history
        }

        with open(ALL_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=4)

        logger.info("Historical JSON updated")


# ---------------- MAIN ---------------- #
def main():
    logger.info("Starting scraper")

    scraper = FuelScraper()
    db = FuelDatabase(DB_FILE)

    with ThreadPoolExecutor() as executor:
        futures = {
            fuel: executor.submit(scraper.scrape, fuel)
            for fuel in URLS
        }

        results = {fuel: f.result() for fuel, f in futures.items()}

    date = results["diesel"][0]

    combined = FuelProcessor.combine(
        results["diesel"][1],
        results["gasoline"][1]
    )

    FuelProcessor.validate(combined)

    db.save(combined, date)

    FuelExporter.export_latest(combined, date)
    FuelExporter.export_daily(combined, date)
    FuelExporter.export_history(db, date)

    db.close()

    logger.info(f"Done. Countries: {len(combined)}")


if __name__ == "__main__":
    main()