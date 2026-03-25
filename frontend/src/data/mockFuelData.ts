import { subDays, format } from "date-fns";

export interface FuelPrice {
  type: string;
  price: number;
  min: number;
  max: number;
  color: string;
}

export interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  lastUpdate: string;
  fuels: { type: string; price: number }[];
  services: string[];
}

export const fuelTypes = [
  { key: "motorina", label: "Motorină", color: "hsl(var(--fuel-motorina))" },
  { key: "motorina_plus", label: "Motorină+", color: "hsl(var(--fuel-motorina-plus))" },
  { key: "benzina95", label: "Benzină 95", color: "hsl(var(--fuel-benzina95))" },
  { key: "benzina98", label: "Benzină 98", color: "hsl(var(--fuel-benzina98))" },
  { key: "gpl", label: "GPL", color: "hsl(var(--fuel-gpl))" },
];

export const averagePrices: FuelPrice[] = [
  { type: "Motorină", price: 9.97, min: 9.79, max: 10.22, color: "hsl(var(--fuel-motorina))" },
  { type: "Motorină+", price: 10.44, min: 10.21, max: 10.58, color: "hsl(var(--fuel-motorina-plus))" },
  { type: "Benzină 95", price: 9.19, min: 9.13, max: 9.26, color: "hsl(var(--fuel-benzina95))" },
  { type: "Benzină 98", price: 9.88, min: 9.19, max: 10.38, color: "hsl(var(--fuel-benzina98))" },
  { type: "GPL", price: 7.67, min: 4.11, max: 8.20, color: "hsl(var(--fuel-gpl))" },
];

export const stations: Station[] = [
  {
    id: "1",
    name: "Eurotruck Arad",
    brand: "PETROM",
    address: "Calea Zimandului",
    lastUpdate: "22/03/2026 00:05",
    fuels: [{ type: "Diesel", price: 9.79 }],
    services: ["AdBlue", "Peaj", "Vigneta"],
  },
  {
    id: "2",
    name: "Arad Saguna",
    brand: "SOCAR",
    address: "Str. Andrei Saguna nr. 99-101, Arad, jud. Arad",
    lastUpdate: "24/03/2026 11:16",
    fuels: [
      { type: "Diesel", price: 9.85 },
      { type: "Benzină 95", price: 9.19 },
      { type: "GPL", price: 7.45 },
    ],
    services: ["Spălătorie", "Magazin"],
  },
  {
    id: "3",
    name: "Arad Centru",
    brand: "MOL",
    address: "Bd. Revoluției nr. 45, Arad",
    lastUpdate: "24/03/2026 09:30",
    fuels: [
      { type: "Diesel", price: 9.97 },
      { type: "Benzină 95", price: 9.22 },
      { type: "Benzină 98", price: 9.88 },
    ],
    services: ["Magazin", "Cafenea"],
  },
];

// Generate 12 months of mock price history (weekly data points)
export function generateYearlyPriceHistory() {
  const today = new Date();
  const data = [];

  const baseValues: Record<string, number> = {
    motorina: 9.97,
    motorina_plus: 10.44,
    benzina95: 9.19,
    benzina98: 9.88,
    gpl: 7.67,
  };

  const prices: Record<string, number> = {};
  // Start from values ~6 months ago with some offset
  for (const key of Object.keys(baseValues)) {
    prices[key] = baseValues[key] - 0.3 + Math.sin(key.length) * 0.2;
  }

  // ~52 weeks in a year
  const totalWeeks = 52;
  for (let i = totalWeeks; i >= 0; i--) {
    const date = subDays(today, i * 7);
    const label = format(date, "MMM yy");

    const entry: Record<string, string | number> = { date: label };

    for (const key of Object.keys(baseValues)) {
      // Seasonal variation + trend + noise
      const seasonal = Math.sin((totalWeeks - i) / 8) * 0.15;
      const trend = (totalWeeks - i) * 0.005;
      const noise = Math.sin(i * 2.3 + key.length * 5) * 0.08 +
                    Math.cos(i * 1.1 + key.length * 3) * 0.05;
      
      prices[key] = baseValues[key] - 0.3 + trend + seasonal + noise;
      prices[key] = Math.max(baseValues[key] - 0.6, Math.min(baseValues[key] + 0.6, prices[key]));
      entry[key] = parseFloat(prices[key].toFixed(2));
    }

    data.push(entry);
  }

  return data;
}

// Keep 30-day history for detail views
export function generatePriceHistory() {
  const today = new Date();
  const data = [];

  const baseValues: Record<string, number> = {
    motorina: 9.97,
    motorina_plus: 10.44,
    benzina95: 9.19,
    benzina98: 9.88,
    gpl: 7.67,
  };

  const prices: Record<string, number> = { ...baseValues };

  const totalPoints = 120;
  for (let i = totalPoints - 1; i >= 0; i--) {
    const hoursAgo = i * 6;
    const date = new Date(today.getTime() - hoursAgo * 3600000);
    const label = format(date, "dd MMM");

    const entry: Record<string, string | number> = { date: label };

    for (const key of Object.keys(baseValues)) {
      const drift = 0.001;
      const noise = (Math.sin(i * 1.7 + key.length * 3) * 0.3 +
                     Math.cos(i * 0.7 + key.length) * 0.2) * 0.02;
      prices[key] = prices[key] + drift + noise;
      prices[key] = Math.max(baseValues[key] - 0.4, Math.min(baseValues[key] + 0.5, prices[key]));
      entry[key] = parseFloat(prices[key].toFixed(2));
    }

    data.push(entry);
  }

  return data;
}