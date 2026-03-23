import { useSearchParams } from "react-router-dom";
import FuelSearch from "../components/FuelSearch";
import CityAverages from "../components/CityAverages";
import SkeletonCard from "../components/SkeletonCard";
import StationCard from "../components/StationCard";
import type { Station, FuelType, PriceSort, SearchResult } from "../types";
import { API_SEARCH_URL, DEFAULT_SORT } from "../constants";
import { useCallback, useState } from "react";
import Footer from "../components/Footer";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | undefined>(undefined);
  const [hasUsedLocation, setHasUsedLocation] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);
  const [lastSearchParams, setLastSearchParams] = useState<string | null>(null);
  const [, setSearchParams] = useSearchParams();

  // Track last known station count for skeleton display
  const [lastStationCount, setLastStationCount] = useState<number>(0);
  // Track last known city for skeleton display
  const [lastCity, setLastCity] = useState<string | undefined>(undefined);

  // Refresh rate limit: 10 minutes in milliseconds
  const REFRESH_LIMIT_MS = 10 * 60 * 1000;
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);

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
      setLastStationCount(sorted.length);
      setLastCity(data.city);
      setCurrentCity(data.city);
      setLastUpdated(data.last_updated);

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
    setLastSearchParams(query);
    doSearch(query);
  };

  const handleSearchAddress = (address: string, fuels: FuelType[], sort: PriceSort) => {
    const { fuelParam, sortParam } = buildSearchQuery(fuels, sort);
    const query = `address=${encodeURIComponent(address)}${fuelParam}${sortParam}`;
    setSearchParams(new URLSearchParams(query));
    setLastSearchParams(query);
    doSearch(query);
  };

  const handleRefresh = async () => {
    if (!lastSearchParams) return;

    // Check rate limit - 10 minutes since last refresh
    const now = Date.now();
    if (lastRefreshTime && (now - lastRefreshTime) < REFRESH_LIMIT_MS) {
      const remainingMinutes = Math.ceil((REFRESH_LIMIT_MS - (now - lastRefreshTime)) / 60000);
      setStatusMessage({ type: "info", text: `⏳ Poți actualiza din nou peste ${remainingMinutes} minute.` });
      return;
    }

    setIsRefreshing(true);
    // Add refresh=true to the last search params
    const refreshQuery = lastSearchParams + "&refresh=true";
    try {
      const res = await fetch(`${API_SEARCH_URL}?${refreshQuery}`);
      const data: SearchResult = await res.json();
      if (data.error) {
        setStatusMessage({ type: "error", text: "❌ Eroare la actualizarea prețurilor." });
        return;
      }
      // Re-process and set stations (similar to doSearch)
      const urlParams = new URLSearchParams(refreshQuery);
      const sortParam = (urlParams.get("sort") as PriceSort) || DEFAULT_SORT;
      let sorted: Station[];
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
        setStations(sorted);
        setLastStationCount(sorted.length);
        setLastCity(data.city);
        setCurrentCity(data.city);
        setLastUpdated(data.last_updated);
      } catch (error) {
        console.error("Refresh Error:", error);
      setStatusMessage({ type: "error", text: "❌ Eroare la actualizarea prețurilor." });
    } finally {
      setIsRefreshing(false);
      setLastRefreshTime(Date.now());
    }
  };

  const handleSearchNearby = (fuels: FuelType[], sort: PriceSort) => {
    if (!navigator.geolocation) {
      setStatusMessage({ type: "error", text: "❌ Geolocalizarea nu este suportată de acest dispozitiv." });
      return;
    }

    // Clear any previous error messages
    setStatusMessage(null);

    const { fuelParam, sortParam } = buildSearchQuery(fuels, sort);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHasUsedLocation(true);
        const query = `lat=${pos.coords.latitude}&lon=${pos.coords.longitude}${fuelParam}${sortParam}`;
        setSearchParams(new URLSearchParams(query));
        doSearch(query);
      },
      (error) => {
        let message = "❌ Nu s-a putut obține locația.";
        let showSettingsHint = false;

        // Only show permission errors if user hasn't successfully used location before
        if (hasUsedLocation) {
          // User has used location before, show a less alarming message for transient errors
          switch (error.code) {
            case error.TIMEOUT:
              message = "⏱️ Timpul de așteptare pentru locație a expirat. Încearcă din nou.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "❌ Locația nu este disponibilă. Verifică dacă GPS-ul este activat pe dispozitiv.";
              break;
            default:
              message = "⚠️ Problema cu determinarea locației. Încearcă din nou.";
          }
        } else {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "📍 Accesul la locație a fost refuzat. Te rog să activezi locația în setările browser-ului.";
              showSettingsHint = true;
              break;
            case error.POSITION_UNAVAILABLE:
              message = "❌ Locația nu este disponibilă. Verifică dacă GPS-ul este activat pe dispozitiv.";
              showSettingsHint = true;
              break;
            case error.TIMEOUT:
              message = "⏱️ Timpul de așteptare pentru locație a expirat. Încearcă din nou.";
              break;
          }
        }

        setStatusMessage({ type: "error", text: message });

        // Show settings hint after a delay on mobile
        if (showSettingsHint) {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobile) {
            setTimeout(() => {
              setStatusMessage({
                type: "info",
                text: "📱 Ghid mobil: Setări → Confidențialitate → Servicii Locație → Browser"
              });
            }, 4000);
          }
        }
      }
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
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% -20%, hsl(221 83% 53% / 0.12), transparent),
          radial-gradient(ellipse 60% 40% at 100% 50%, hsl(250 60% 60% / 0.08), transparent),
          radial-gradient(ellipse 60% 40% at 0% 80%, hsl(36 90% 55% / 0.06), transparent),
          hsl(var(--background))
        `
      }}
    >
      <FuelSearch
        onSearchCity={handleSearchCity}
        onSearchAddress={handleSearchAddress}
        onSearchNearby={handleSearchNearby}
        onClearSearch={handleClearSearch}
        isLoading={isLoading}
        hasSearched={hasSearched}
      />

      {/* Decorative SVG rings */}
      {/* Decorative lines */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[18%] left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/10 to-transparent" />
        <div className="absolute bottom-[22%] left-0 right-0 h-px bg-linear-to-r from-transparent via-fuel-motorina/8 to-transparent" />
      </div>

      <main className={`max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5 ${hasSearched ? "pt-3 sm:pt-4" : ""}`}>
        {statusMessage && !isLoading && (
          <p className={`text-center text-sm font-medium ${statusMessage.type === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {statusMessage.text}
          </p>
        )}

        {!isLoading && stations.length > 0 && currentCity && (
          <CityAverages
            stations={stations}
            city={currentCity}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            canRefresh={!lastRefreshTime || (Date.now() - lastRefreshTime) >= REFRESH_LIMIT_MS}
            lastUpdated={lastUpdated}
          />
        )}

        {/* Show CityAverages skeleton during loading (use last known city) */}
        {isLoading && lastStationCount > 0 && lastCity && (
          <CityAverages
            stations={[]}
            city={lastCity}
            onRefresh={handleRefresh}
            isLoading={true}
            canRefresh={false}
          />
        )}

        {isLoading && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-4 sm:py-6">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Se caută stații…</p>
            </div>
            {/* Show skeletons matching last known count for consistency with refresh */}
            {[...Array(lastStationCount > 0 ? lastStationCount : 5)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {isRefreshing && stations.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-4 sm:py-6">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Se actualizează prețurile…</p>
            </div>
            {[...Array(stations.length)].map((_, i) => (
              <SkeletonCard key={`refresh-${i}`} />
            ))}
          </div>
        )}

        {!isLoading && stations.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
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
      <Footer />
    </div>
  );
};

export default Index;
