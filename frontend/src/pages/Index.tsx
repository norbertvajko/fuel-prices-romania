import { useState, useCallback, useRef, useEffect } from "react";
import HeroSection from "../components/HeroSection";
import YearlyChart from "../components/YearlyChart";
import CityAverages from "../components/CityAverages";
import StationCard from "../components/StationCard";
import { StationListSkeleton, TodayPricesSkeleton } from "../components/Skeletons";
import FuelLoader from "../components/FuelLoader";
import { API_URL } from "../constants";
import type { Station, LiveFuelPrice } from "../types";
import Footer from "../components/Footer";
import LivePricesGrid from "../components/LivePricesGrid";

interface NationalAverageEntry {
  date: string;
  fuel_type: string;
  price: number;
}

interface FuelPrice {
  price: string;
  label: string;
}

type RawEntry = { date: string; fuel_type: string; price: number };

const Index = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();
  const [isChartLoaded, setIsChartLoaded] = useState(false);
  const [chartProgress, setChartProgress] = useState(0);
  const cityAveragesRef = useRef<HTMLDivElement>(null);
  const [isLightMode, setIsLightMode] = useState(false);
  const [nationalFuelPrices, setNationalFuelPrices] = useState<FuelPrice[]>([]);
  const [currentFuelIndex, setCurrentFuelIndex] = useState(0);
  const [nationalAverageHistory, setNationalAverageHistory] = useState<RawEntry[]>([]);
  const [liveFuelPrices, setLiveFuelPrices] = useState<LiveFuelPrice[]>([]);

  // Track last known city for skeleton display
  const [lastCity, setLastCity] = useState<string | undefined>(undefined);

  useEffect(() => {
    const checkTheme = () => {
      setIsLightMode(document.documentElement.classList.contains("light"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Fetch national average prices for all fuel types
  useEffect(() => {
    const fetchNationalAverage = async () => {
      try {
        const response = await fetch(`${API_URL}/price-history/national?days=all`);
        const result = await response.json();
        
        if (result.history && result.history.length > 0) {
          // Store full history for YearlyChart
          setNationalAverageHistory(result.history);

          // Get today's date in YYYY-MM-DD format
          const today = new Date().toISOString().split('T')[0];
          
          // Get yesterday's date
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          // Get today's price for each fuel type
          const fuelTypes = [
            { fuel_type: "diesel", label: "Motorină", colorClass: "bg-fuel-diesel" },
            { fuel_type: "diesel_plus", label: "Motorină+", colorClass: "bg-fuel-diesel-plus" },
            { fuel_type: "b95", label: "Benzină 95", colorClass: "bg-fuel-benzina95" },
            { fuel_type: "b98", label: "Benzină 98", colorClass: "bg-fuel-benzina98" },
            { fuel_type: "gpl", label: "GPL", colorClass: "bg-fuel-gpl" },
          ];

          const prices: FuelPrice[] = [];
          const livePrices: LiveFuelPrice[] = [];
          
          fuelTypes.forEach(({ fuel_type, label, colorClass }) => {
            // Find today's entry for this fuel type
            const todayEntry = result.history.find(
              (entry: NationalAverageEntry) => 
                entry.fuel_type === fuel_type && entry.date === today
            );
            
            // Find yesterday's entry for this fuel type
            const yesterdayEntry = result.history.find(
              (entry: NationalAverageEntry) => 
                entry.fuel_type === fuel_type && entry.date === yesterdayStr
            );
            
            // If no entry for today, get the most recent entry
            const sortedEntries = result.history
              .filter((entry: NationalAverageEntry) => entry.fuel_type === fuel_type)
              .sort((a: NationalAverageEntry, b: NationalAverageEntry) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              );
            
            const latestEntry = todayEntry || sortedEntries[0];
            
            // Calculate yesterday's price from sorted entries
            const yesterdayPrice = yesterdayEntry ? yesterdayEntry.price : 
              (sortedEntries.length > 1 ? sortedEntries[1]?.price : latestEntry?.price);
            
            if (latestEntry) {
              // For hero section cycling
              prices.push({
                price: latestEntry.price.toFixed(1),
                label,
              });
              
              // For LivePricesGrid - with change from yesterday
              const change = latestEntry.price - (yesterdayPrice || latestEntry.price);
              livePrices.push({
                name: label,
                price: parseFloat(latestEntry.price.toFixed(2)),
                change: parseFloat(change.toFixed(2)),
                colorClass,
              });
            }
          });

          if (prices.length > 0) {
            setNationalFuelPrices(prices);
          }
          if (livePrices.length > 0) {
            setLiveFuelPrices(livePrices);
          }
        }
      } catch (error) {
        // Silently fail - will use fallback value
      }
    };

    fetchNationalAverage();
  }, []);

  // Cycle through fuel types every 3 seconds
  useEffect(() => {
    if (nationalFuelPrices.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentFuelIndex((prev) => (prev + 1) % nationalFuelPrices.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [nationalFuelPrices]);

  // Fetch data from your own API (scrapes fresh data)
  const doSearch = useCallback(async (city: string, lat?: number, lon?: number) => {
    setIsLoading(true);
    setStations([]);
    setHasSearched(true);
    setLastCity(city);

    try {
      // Build URL with optional coordinates
      let url = `${API_URL}/search?city=${encodeURIComponent(city)}`;
      if (lat !== undefined && lon !== undefined) {
        url += `&lat=${lat}&lon=${lon}`;
      }
      
      // Call /search endpoint which scrapes fresh data from external API
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return;
      }

      // Transform data to match expected format
      const transformedStations: Station[] = data.stations.map((station: any) => ({
        name: station.name,
        network: station.network,
        networkLogo: station.networkLogo,
        address: station.address,
        lat: station.lat,
        lon: station.lon,
        prices: station.prices || [],
        services: station.services || [],
        updatedate: station.updatedate,
        contactDetails: station.contactDetails,
      }));

      setStations(transformedStations);
      setCurrentCity(city);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle city search from HeroSection
  const handleSearchFromHero = (city: string, lat?: number, lon?: number) => {
    doSearch(city, lat, lon);

    // Scroll to the CityAverages section
    setTimeout(() => {
      if (cityAveragesRef.current) {
        cityAveragesRef.current.scrollIntoView({ behavior: "smooth", block: "start", });
      }
    }, 100);
  };

  // Handle refresh
  const handleRefresh = () => {
    if (!currentCity) return;
    setRefreshing(true);
    doSearch(currentCity).finally(() => setRefreshing(false));
  };

  return (
    <div className={`main-container flex flex-col overflow-hidden ${
      isLightMode
        ? "bg-white text-gray-900"
        : "bg-gradient-to-br from-hero-bg via-hero-bg to-hero-bg-dark text-hero-foreground"
    }`}>
      {/* Show loader until chart is loaded */}
      {!isChartLoaded && (
        <FuelLoader onComplete={() => setIsChartLoaded(true)} progress={chartProgress} />
      )}
      <HeroSection
        onSearch={handleSearchFromHero}
        nationalDieselAvgPrice={nationalFuelPrices[currentFuelIndex]?.price || "10.3"}
        nationalFuelLabel={nationalFuelPrices[currentFuelIndex]?.label || "Motorină"}
      />

      <div className="mx-auto sm:mx-0 -mt-6 relative z-20">
        <LivePricesGrid prices={liveFuelPrices} />
      </div>

      {/* Chart - always show */}
      <section className="mx-auto px-4 mt-22 sm:mt-8 z-10 w-full">
        <YearlyChart
          onLoadingComplete={() => setIsChartLoaded(true)}
          onProgress={(progress) => setChartProgress(progress)}
          data={nationalAverageHistory}
        />
      </section>
      {/* Today's prices - Real data from your API */}
      {(isLoading || refreshing || stations.length > 0) && (
        <section ref={cityAveragesRef} className="mx-auto max-w-5xl mt-12 w-fit sm:w-full">
          {isLoading || refreshing ? (
            <TodayPricesSkeleton />
          ) : (
            <CityAverages
              city={lastCity || currentCity || ""}
              stations={stations}
              onRefresh={handleRefresh}
              isRefreshing={refreshing}
              isLoading={isLoading}
              lastUpdated={lastUpdated}
            />
          )}
        </section>
      )}

      {/* Stations section - Real data from your API */}
      {(isLoading || stations.length > 0 || hasSearched) && (
        <section className="w-full max-w-5xl mx-auto mt-8 px-4 sm:px-0">
          {isLoading ? (
            <StationListSkeleton />
          ) : stations.length > 0 ? (
            <div className="space-y-4">
              {(() => {
                // Calculate cheapest price for each station (diesel or benzina)
                const stationsWithCheapest = stations.map((station, idx) => {
                  const dieselPrices = station.prices.filter(p =>
                    p.fuel.includes('Motorină') && p.price > 0
                  );
                  const benzinaPrices = station.prices.filter(p =>
                    p.fuel.includes('Benzină') && p.price > 0
                  );

                  const minDiesel = dieselPrices.length > 0 ? Math.min(...dieselPrices.map(p => p.price)) : Infinity;
                  const minBenzina = benzinaPrices.length > 0 ? Math.min(...benzinaPrices.map(p => p.price)) : Infinity;
                  const cheapestPrice = Math.min(minDiesel, minBenzina);

                  return {
                    station,
                    originalIndex: idx,
                    cheapestPrice,
                    minDiesel,
                    minBenzina
                  };
                });

                // Find cheapest diesel and benzina stations
                let cheapestDieselIndex = -1;
                let cheapestDieselPrice = Infinity;
                let cheapestBenzinaIndex = -1;
                let cheapestBenzinaPrice = Infinity;

                stationsWithCheapest.forEach((item, idx) => {
                  if (item.minDiesel < cheapestDieselPrice) {
                    cheapestDieselPrice = item.minDiesel;
                    cheapestDieselIndex = idx;
                  }
                  if (item.minBenzina < cheapestBenzinaPrice) {
                    cheapestBenzinaPrice = item.minBenzina;
                    cheapestBenzinaIndex = idx;
                  }
                });

                // Use stations in the order returned by backend (already sorted by diesel price)
                return stationsWithCheapest.map((item, index) => (
                  <StationCard
                    key={item.station.name + index}
                    station={item.station}
                    cheapestPrice={item.cheapestPrice}
                    isMostCheapestDiesel={index === cheapestDieselIndex}
                    isMostCheapestBenzina={index === cheapestBenzinaIndex}
                    index={index}
                  />
                ));
              })()}
            </div>
          ) : hasSearched ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nu s-au găsit stații în această zonă</p>
            </div>
          ) : null}
        </section>
      )}
      <Footer />
    </div>
  );
};

export default Index;
