"""
Configuration constants for the Fuel Price API.
"""
import os

# HTTP headers for external API requests
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
}

# Base URL for the fuel price monitoring service
BASE_URL = "https://monitorulpreturilor.info/pmonsvc/Gas"

# Product IDs to fetch from the external API
FUEL_PRODUCT_IDS = [11, 12, 21, 22, 31, 41]

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fuel_prices.db")

# CORS allowed origins
CORS_ORIGINS = [
    "http://localhost:5173",
    "https://romaniapetrolprices.netlify.app",
]

# Fuel type filter mapping
FUEL_FILTER_MAP = {
    "benzina": ["Benzină 95", "Benzină 98"],
    "motorina": ["Motorină standard", "Motorină premium"],
    "gpl": ["GPL"],
    "electric": ["Încărcare electrică", "Incarcare Electrica"],
}

# Fuel name mapping for frontend
FUEL_NAME_MAP = {
    "Benzină standard": "Benzină 95",
    "Benzină premium": "Benzină 98",
    "Motorină standard": "Motorină standard",
    "Motorină premium": "Motorină premium",
    "GPL": "GPL",
    "Încărcare electrică": "Incarcare Electrica",
    "Incarcare Electrica": "Incarcare Electrica",
    "Încărcare Electrică": "Incarcare Electrica",
    "Electric": "Incarcare Electrica",
}