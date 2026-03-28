import { useState, useCallback, useRef } from "react";
import HeroSection from "../components/HeroSection";
import YearlyChart from "../components/YearlyChart";
import CityAverages from "../components/CityAverages";
import StationCard from "../components/StationCard";
import { StationListSkeleton, TodayPricesSkeleton } from "../components/Skeletons";
import FuelLoader from "../components/FuelLoader";
import { API_URL } from "../constants";
import type { Station } from "../types";
import Footer from "../components/Footer";

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

  // Track last known city for skeleton display
  const [lastCity, setLastCity] = useState<string | undefined>(undefined);

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
    <div className="main-container flex flex-col bg-background overflow-hidden">
      {/* Show loader until chart is loaded */}
      {!isChartLoaded && (
        <FuelLoader onComplete={() => setIsChartLoaded(true)} progress={chartProgress} />
      )}

      <HeroSection onSearch={handleSearchFromHero} />

      {/* Chart - always show */}
      <section className="mx-auto px-4 -mt-12 relative z-10 w-full">
        <YearlyChart
          onLoadingComplete={() => setIsChartLoaded(true)}
          onProgress={(progress) => setChartProgress(progress)}
        />
      </section>
      {/* Today's prices - Real data from your API */}
      <section ref={cityAveragesRef} className="max-w-6xl mx-auto px-4 mt-12 w-full">
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

      {/* Stations section - Real data from your API */}
      <section className="max-w-6xl mx-auto px-4 mt-8 w-full">
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
      <Footer />
    </div>
  );
};

export default Index;
