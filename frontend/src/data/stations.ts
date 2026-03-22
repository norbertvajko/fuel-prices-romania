export type FuelType = "diesel" | "diesel_plus" | "b95" | "b98" | "gpl";

export const FUEL_LABELS: Record<FuelType, string> = {
    diesel: "Motorină",
    diesel_plus: "Motorină+",
    b95: "Benzină 95",
    b98: "Benzină 98",
    gpl: "GPL",
};

export const FUEL_COLORS: Record<FuelType, string> = {
    diesel: "bg-sky-500",
    diesel_plus: "bg-sky-600",
    b95: "bg-amber-500",
    b98: "bg-amber-600",
    gpl: "bg-emerald-500",
};

export interface Fuel {
    type: FuelType;
    price: number;
}

export interface Station {
    name: string;
    network: string;
    networkLogo?: string;
    fuels: Fuel[];
    lat: number;
    lon: number;
    address?: string;
    updatedate?: string;
    services?: { name: string; logo: string }[];
    contactDetails?: string;
}