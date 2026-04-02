import type { FuelType } from "../types";

// Main API URL - uses env variables for different modes
const BASE_API_URL =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_DEV_API_URL
    : import.meta.env.VITE_PROD_API_URL;

export const API_URL = BASE_API_URL;
