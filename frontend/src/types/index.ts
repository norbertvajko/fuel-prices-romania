// Fuel types
export type FuelType = "benzina" | "motorina" | "gpl" | "electric";

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

// Live fuel price with change
export interface LiveFuelPrice {
  name: string;
  price: number;
  change: number;
  colorClass: string;
}
