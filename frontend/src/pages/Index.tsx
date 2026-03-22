import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import FuelSearch from "../components/FuelSearch";
import CityAverages from "../components/CityAverages";

type FuelType = "benzina" | "motorina" | "gpl" | "electric";
type PriceSort = "cheapest" | "expensive" | "cheapest_motorina" | "expensive_motorina" | "cheapest_benzina" | "expensive_benzina" | "cheapest_gpl" | "expensive_gpl";
import SkeletonCard from "../components/SkeletonCard";
import StationCard from "../components/StationCard";

interface Price {
    fuel: string;
    price: number;
}

interface Station {
    name: string;
    network: string;
    networkLogo?: string;
    prices: Price[];
    lat: number;
    lon: number;
    address?: string;
    updatedate?: string;
    services?: { name: string; logo: string }[];
    contactDetails?: string;
}

interface SearchResult {
    stations: Station[];
    count: number;
    city?: string;
    error?: string;
}

const API_URL = "http://localhost:8000/search";

// Calculate distance between two coordinates in km (Haversine formula)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const Index = () => {
    const [stations, setStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentCity, setCurrentCity] = useState<string | undefined>(undefined);
    const [searchParams, setSearchParams] = useSearchParams();

    const doSearch = useCallback(async (params: string, sort: PriceSort = "cheapest") => {
        setIsLoading(true);
        setStations([]);
        setHasSearched(true);

        try {
            const res = await fetch(`${API_URL}?${params}`);
            const data: SearchResult = await res.json();
            console.log(data);

            if (data.error) {
                setStatusMessage({ type: "error", text: "❌ Orașul nu a fost găsit sau nu există date disponibile." });
                return;
            }

            // Check if this is a nearby search (has lat/lon)
            const urlParams = new URLSearchParams(params);
            const userLat = urlParams.get('lat');
            const userLon = urlParams.get('lon');

            // Helper to get price for a specific fuel type
            const getFuelPrice = (prices: Price[], fuelNames: string[]): number => {
                const matching = prices.filter(p => fuelNames.some(fn => p.fuel.toLowerCase().includes(fn.toLowerCase())));
                return matching.length > 0 ? Math.min(...matching.map(p => p.price)) : Infinity;
            };

            let sorted: Station[];
            
            // Get URL params for sorting
            const sortParam = urlParams.get('sort') as PriceSort || sort;
            
            if (userLat && userLon) {
                // Sort by distance from user location
                const ulat = parseFloat(userLat);
                const ulon = parseFloat(userLon);
                sorted = [...data.stations].sort((a, b) => {
                    const distA = getDistance(ulat, ulon, a.lat, a.lon);
                    const distB = getDistance(ulat, ulon, b.lat, b.lon);
                    return distA - distB;
                });
            } else {
                // Sort by price based on sort option
                sorted = [...data.stations].sort((a, b) => {
                    const aPrices = a.prices || [];
                    const bPrices = b.prices || [];
                    
                    let aPrice: number, bPrice: number;
                    
                    switch (sortParam) {
                        case "expensive":
                            aPrice = aPrices.length > 0 ? Math.max(...aPrices.map(p => p.price)) : -Infinity;
                            bPrice = bPrices.length > 0 ? Math.max(...bPrices.map(p => p.price)) : -Infinity;
                            return bPrice - aPrice;
                        case "cheapest_motorina":
                            aPrice = getFuelPrice(aPrices, ["motorin"]);
                            bPrice = getFuelPrice(bPrices, ["motorin"]);
                            return aPrice - bPrice;
                        case "expensive_motorina":
                            aPrice = getFuelPrice(aPrices, ["motorin"]);
                            bPrice = getFuelPrice(bPrices, ["motorin"]);
                            return aPrice === Infinity ? 1 : bPrice === Infinity ? -1 : bPrice - aPrice;
                        case "cheapest_benzina":
                            aPrice = getFuelPrice(aPrices, ["benzin"]);
                            bPrice = getFuelPrice(bPrices, ["benzin"]);
                            return aPrice - bPrice;
                        case "expensive_benzina":
                            aPrice = getFuelPrice(aPrices, ["benzin"]);
                            bPrice = getFuelPrice(bPrices, ["benzin"]);
                            return aPrice === Infinity ? 1 : bPrice === Infinity ? -1 : bPrice - aPrice;
                        case "cheapest_gpl":
                            aPrice = getFuelPrice(aPrices, ["gpl"]);
                            bPrice = getFuelPrice(bPrices, ["gpl"]);
                            return aPrice - bPrice;
                        case "expensive_gpl":
                            aPrice = getFuelPrice(aPrices, ["gpl"]);
                            bPrice = getFuelPrice(bPrices, ["gpl"]);
                            return aPrice === Infinity ? 1 : bPrice === Infinity ? -1 : bPrice - aPrice;
                        default: // cheapest
                            aPrice = aPrices.length > 0 ? Math.min(...aPrices.map(p => p.price)) : Infinity;
                            bPrice = bPrices.length > 0 ? Math.min(...bPrices.map(p => p.price)) : Infinity;
                            return aPrice - bPrice;
                    }
                });
            }

            setStations(sorted);
            setCurrentCity(data.city);
        } catch (error) {
            console.error("API Error:", error);
            setStatusMessage({ type: "error", text: "❌ Eroare la conectarea cu serverul. Asigură-te că backend-ul rulează pe portul 8000." });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSearchCity = (city: string, fuels: FuelType[], sort: PriceSort) => {
        const fuelParam = fuels.length > 0 ? `&fuels=${fuels.join(",")}` : "";
        const sortParam = `&sort=${sort}`;
        const query = `city=${encodeURIComponent(city)}${fuelParam}${sortParam}`;
        setSearchParams(new URLSearchParams(query));
        doSearch(query);
    };

    const handleSearchAddress = (address: string, fuels: FuelType[], sort: PriceSort) => {
        const fuelParam = fuels.length > 0 ? `&fuels=${fuels.join(",")}` : "";
        const sortParam = `&sort=${sort}`;
        const query = `address=${encodeURIComponent(address)}${fuelParam}${sortParam}`;
        setSearchParams(new URLSearchParams(query));
        doSearch(query);
    };

    const handleSearchNearby = (fuels: FuelType[], sort: PriceSort) => {
        if (!navigator.geolocation) {
            setStatusMessage({ type: "error", text: "❌ Geolocalizarea nu este suportată." });
            return;
        }
        const fuelParam = fuels.length > 0 ? `&fuels=${fuels.join(",")}` : "";
        const sortParam = `&sort=${sort}`;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const query = `lat=${pos.coords.latitude}&lon=${pos.coords.longitude}${fuelParam}${sortParam}`;
                setSearchParams(new URLSearchParams(query));
                doSearch(query);
            },
            () => setStatusMessage({ type: "error", text: "❌ Nu s-a putut obține locația." })
        );
    };

    const minPrice = stations.length > 0
        ? Math.min(...stations.flatMap((s) => (s.prices || []).map((p) => p.price)))
        : Infinity;

    return (
        <div className="min-h-screen">
            <FuelSearch
                onSearchCity={handleSearchCity}
                onSearchAddress={handleSearchAddress}
                onSearchNearby={handleSearchNearby}
                onClearSearch={() => {
                    setStations([]);
                    setHasSearched(false);
                    setStatusMessage(null);
                    setCurrentCity(undefined);
                }}
                isLoading={isLoading}
                hasSearched={hasSearched}
            />

            {/* Content - Add top padding when navbar is shown */}
            <main className={`max-w-6xl mx-auto px-4 py-6 space-y-5 ${hasSearched ? "pt-4" : ""}`}>
                {statusMessage && !isLoading && (
                    <p
                        className={`text-center text-sm font-medium ${statusMessage.type === "error"
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                    >
                        {statusMessage.text}
                    </p>
                )}

                {/* Show CityAverages when we have stations from a successful search */}
                {!isLoading && stations.length > 0 && currentCity && (
                    <CityAverages stations={stations} city={currentCity} />
                )}

                {isLoading && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-3 py-6">
                            <div className="flex gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Se caută stații în apropiere…</p>
                        </div>
                        {[...Array(3)].map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                )}

                {!isLoading && stations.length > 0 && (
                    <div className="space-y-3">
                        {stations.map((s, i) => {
                            const stationPrices = s.prices || [];
                            const cheapestPrice = stationPrices.length > 0 ? Math.min(...stationPrices.map((p) => p.price)) : 0;

                            return (
                                <StationCard
                                    key={`${s.name}-${i}`}
                                    name={s.name}
                                    network={s.network}
                                    networkLogo={(s as any).networkLogo || ""}
                                    prices={s.prices}
                                    lat={s.lat}
                                    lon={s.lon}
                                    cheapestPrice={cheapestPrice}
                                    isOverallCheapest={cheapestPrice === minPrice}
                                    index={i}
                                    updatedate={(s as any).updatedate || "N/A"}
                                    address={s.address || "Adresă necunoscută"}
                                    services={(s as any).services || []}
                                    contactDetails={s.contactDetails || ""}
                                />
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Index;