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
  logo?: string;
}

// Sort option for UI
export interface SortOption {
  id: PriceSort;
  label: string;
}

// Live fuel price with change
export interface LiveFuelPrice {
  name: string;
  price: number;
  change: number;
  colorClass: string;
}
