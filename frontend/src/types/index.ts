// Fuel types
export type FuelType = "benzina" | "motorina" | "gpl" | "electric";

// Sort options
export type PriceSort = 
  | "cheapest" 
  | "expensive" 
  | "cheapest_motorina" 
  | "expensive_motorina" 
  | "cheapest_benzina" 
  | "expensive_benzina" 
  | "cheapest_gpl" 
  | "expensive_gpl";

// Station price
export interface Price {
  fuel: string;
  price: number;
}

// Station data from API
export interface Station {
  name: string;
  network: string;
  networkLogo?: string;
  prices: Price[];
  lat: number;
  lon: number;
  address?: string;
  updatedate?: string;
  services?: Service[];
  contactDetails?: string;
}

// Service offered by station
export interface Service {
  name: string;
  logo: string;
}

// Search result from API
export interface SearchResult {
  stations: Station[];
  count: number;
  city?: string;
  error?: string;
  cached?: boolean;
  last_updated?: string;
}

// Search mode
export type SearchMode = "city" | "address";

// Sort option for UI
export interface SortOption {
  id: PriceSort;
  label: string;
}

// Fuel type for UI
export interface FuelOption {
  id: FuelType;
  label: string;
  icon: typeof import("lucide-react").Flame;
  color: string;
  activeBg: string;
}
