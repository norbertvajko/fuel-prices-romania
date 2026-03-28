import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import json
import time
import re


class RomaniaFuelScraper:

    BASE_URL = "https://ro.fuelo.net/prices/date/{date}?lang=ro"

    HEADERS = {
        "User-Agent": "Mozilla/5.0"
    }

    # ✅ FINAL CORRECT MAPPING (as you defined)
    FUEL_MAP = {
        1: "b95",          # benzina standard
        2: "diesel",       # diesel
        3: "gpl",          # GPL
        4: "b98",          # benzina premium
        5: "diesel_plus"   # motorina premium
    }

    def clean_price(self, text):
        """Extract float from '8,12 +0,00'"""
        match = re.search(r"\d+[.,]\d+", text)
        if not match:
            return None
        return float(match.group().replace(",", "."))

    def fetch_day(self, date_str):
        url = self.BASE_URL.format(date=date_str)

        try:
            r = requests.get(url, headers=self.HEADERS, timeout=15)
            r.raise_for_status()
        except Exception as e:
            print(f"[ERROR] {date_str}: {e}")
            return []

        soup = BeautifulSoup(r.text, "html.parser")

        # 🔥 FIND "Prețul mediu" ROW
        target_row = None

        for row in soup.find_all("tr"):
            if "prețul mediu" in row.get_text(strip=True).lower():
                target_row = row
                break

        if not target_row:
            print(f"[WARN] No average row found for {date_str}")
            return []

        cols = target_row.find_all("th")

        results = []

        # skip column 0 (label)
        for i in range(1, len(cols)):
            price = self.clean_price(cols[i].get_text())

            if price is None:
                continue

            fuel_type = self.FUEL_MAP.get(i)

            if fuel_type:
                results.append({
                    "date": date_str,
                    "fuel_type": fuel_type,
                    "price": round(price, 2)
                })

        return results

    def fetch_range(self, start, end):
        start = datetime.strptime(start, "%Y-%m-%d")
        end = datetime.strptime(end, "%Y-%m-%d")

        all_data = []
        failed = []

        while start <= end:
            date_str = start.strftime("%Y-%m-%d")
            print("[INFO] Fetching", date_str)

            data = self.fetch_day(date_str)

            if len(data) != 5:
                failed.append(date_str)

            all_data.extend(data)

            start += timedelta(days=1)
            time.sleep(0.7)

        return {
            "days": len(set(x["date"] for x in all_data)),
            "rows": len(all_data),
            "history": all_data,
            "failed_days": failed
        }

    def save(self, data, filename):
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    scraper = RomaniaFuelScraper()

    result = scraper.fetch_range("2016-08-01", "2026-03-23")

    scraper.save(result, "romania_prices_2016_8_1_2026_03_23.json")

    print("DONE")
    print("Days:", result["days"])
    print("Rows:", result["rows"])