import type { FuelType, PriceSort, SortOption } from "../types";
import { Flame, Droplets, Zap, Fuel } from "lucide-react";

// Fuel types configuration with icons
export const FUEL_OPTIONS: { id: FuelType; label: string; icon: typeof Flame; color: string; activeBg: string }[] = [
  { id: "benzina", label: "Benzină", icon: Flame, color: "text-amber-600", activeBg: "bg-amber-50 border-amber-200 text-amber-700" },
  { id: "motorina", label: "Motorină", icon: Droplets, color: "text-sky-600", activeBg: "bg-sky-50 border-sky-200 text-sky-700" },
  { id: "gpl", label: "GPL", icon: Zap, color: "text-emerald-600", activeBg: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { id: "electric", label: "Electric", icon: Fuel, color: "text-purple-600", activeBg: "bg-purple-50 border-purple-200 text-purple-700" },
];

// Sort options
export const SORT_OPTIONS: SortOption[] = [
  { id: "cheapest_motorina", label: "Cea mai ieftină Motorină" },
  { id: "expensive_motorina", label: "Cea mai scumpă Motorină" },
  { id: "cheapest_benzina", label: "Cea mai ieftină Benzină" },
  { id: "expensive_benzina", label: "Cea mai scumpă Benzină" },
  { id: "cheapest_gpl", label: "Cel mai ieftin GPL" },
  { id: "expensive_gpl", label: "Cel mai scump GPL" },
];

// Default sort
export const DEFAULT_SORT: PriceSort = "cheapest_motorina";

// All fuel types
export const ALL_FUELS: FuelType[] = ["benzina", "motorina", "gpl", "electric"];

const BASE_API_URL =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_API_DEV
    : import.meta.env.VITE_API_PROD;

// Export main API URL
export const API_URL = BASE_API_URL;

// Export search endpoint
export const API_SEARCH_URL = `${BASE_API_URL}/search`;
