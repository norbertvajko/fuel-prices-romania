"""
Backend services package.
"""
from .scraper import get_uat_id, get_prices_by_product, get_prices_by_uat
from .geocoding import reverse_geocode, geocode_address, calculate_distance
from .scheduler import update_all_cities, fetch_and_save_national_average, get_national_trends
from .major_cities import MAJOR_CITIES

__all__ = [
    "get_uat_id",
    "get_prices_by_product", 
    "get_prices_by_uat",
    "reverse_geocode",
    "geocode_address",
    "calculate_distance",
    "update_all_cities",
    "fetch_and_save_national_average",
    "get_national_trends",
    "MAJOR_CITIES",
]