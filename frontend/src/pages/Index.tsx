import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import FuelSearch from "../components/FuelSearch";
import CityAverages from "../components/CityAverages";
import SkeletonCard from "../components/SkeletonCard";
import StationCard from "../components/StationCard";
import type { Station, FuelType, PriceSort, SearchResult } from "../types";
import { API_SEARCH_URL, DEFAULT_SORT } from "../constants";

// Calculate distance between two coordinates in km (Haversine formula)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper to get price for a specific fuel type
const getFuelPrice = (prices: Station["prices"], fuelNames: string[]): number => {
  const matching = prices.filter(p => fuelNames.some(fn => p.fuel.toLowerCase().includes(fn.toLowerCase())));
  return matching.length > 0 ? Math.min(...matching.map(p => p.price)) : Infinity;
};

const Index = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | undefined>(undefined);
  const [, setSearchParams] = useSearchParams();

  const doSearch = useCallback(async (params: string) => {
    setIsLoading(true);
    setStations([]);
    setHasSearched(true);

    try {
      const res = await fetch(`${API_SEARCH_URL}?${params}`);
      const data: SearchResult = await res.json();

      if (data.error) {
        setStatusMessage({ type: "error", text: "❌ Orașul nu a fost găsit sau nu există date disponibile." });
        return;
      }

      const urlParams = new URLSearchParams(params);
      const userLat = urlParams.get("lat");
      const userLon = urlParams.get("lon");
      const sortParam = (urlParams.get("sort") as PriceSort) || DEFAULT_SORT;

      let sorted: Station[];

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
            default:
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

  const buildSearchQuery = (fuels: FuelType[], sort: PriceSort) => {
    const fuelParam = fuels.length > 0 ? `&fuels=${fuels.join(",")}` : "";
    const sortParam = `&sort=${sort}`;
    return { fuelParam, sortParam };
  };

  const handleSearchCity = (city: string, fuels: FuelType[], sort: PriceSort) => {
    const { fuelParam, sortParam } = buildSearchQuery(fuels, sort);
    const query = `city=${encodeURIComponent(city)}${fuelParam}${sortParam}`;
    setSearchParams(new URLSearchParams(query));
    doSearch(query);
  };

  const handleSearchAddress = (address: string, fuels: FuelType[], sort: PriceSort) => {
    const { fuelParam, sortParam } = buildSearchQuery(fuels, sort);
    const query = `address=${encodeURIComponent(address)}${fuelParam}${sortParam}`;
    setSearchParams(new URLSearchParams(query));
    doSearch(query);
  };

  const handleSearchNearby = (fuels: FuelType[], sort: PriceSort) => {
    if (!navigator.geolocation) {
      setStatusMessage({ type: "error", text: "❌ Geolocalizarea nu este suportată." });
      return;
    }
    const { fuelParam, sortParam } = buildSearchQuery(fuels, sort);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const query = `lat=${pos.coords.latitude}&lon=${pos.coords.longitude}${fuelParam}${sortParam}`;
        setSearchParams(new URLSearchParams(query));
        doSearch(query);
      },
      () => setStatusMessage({ type: "error", text: "❌ Nu s-a putut obține locația." })
    );
  };

  const handleClearSearch = () => {
    setStations([]);
    setHasSearched(false);
    setStatusMessage(null);
    setCurrentCity(undefined);
    setSearchParams(new URLSearchParams());
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
        onClearSearch={handleClearSearch}
        isLoading={isLoading}
        hasSearched={hasSearched}
      />

      <main className={`max-w-6xl mx-auto px-4 py-6 space-y-5 ${hasSearched ? "pt-4" : ""}`}>
        {statusMessage && !isLoading && (
          <p className={`text-center text-sm font-medium ${statusMessage.type === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {statusMessage.text}
          </p>
        )}

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
              <p className="text-sm font-medium text-muted-foreground">Se caută stații…</p>
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
                  station={s}
                  cheapestPrice={cheapestPrice}
                  isOverallCheapest={cheapestPrice === minPrice}
                  index={i}
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
