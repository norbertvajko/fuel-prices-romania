import { useState, useCallback } from "react";
import HeroSection from "../components/HeroSection";
import YearlyChart from "../components/YearlyChart";
import CityAverages from "../components/CityAverages";
import StationCard from "../components/StationCard";
import { ChartSkeleton, StationListSkeleton, TodayPricesSkeleton } from "../components/Skeletons";
import { API_SEARCH_URL, DEFAULT_SORT } from "../constants";
import type { Station, SearchResult } from "../types";

const Index = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();
  
  // Track last known city for skeleton display
  const [lastCity, setLastCity] = useState<string | undefined>(undefined);

  // Fetch data from API
  const doSearch = useCallback(async (params: string) => {
    setIsLoading(true);
    setStations([]);
    setHasSearched(true);

    // Extract city from params for skeleton display during loading
    const urlParams = new URLSearchParams(params);
    const cityParam = urlParams.get("city");
    if (cityParam) {
      setLastCity(decodeURIComponent(cityParam));
    }

    try {
      const res = await fetch(`${API_SEARCH_URL}?${params}`);
      const data: SearchResult = await res.json();

      if (data.error) {
        console.error("Search error:", data.error);
        return;
      }

      // Don't sort - use the API response directly
      setStations(data.stations);
      setCurrentCity(data.city);
      setLastUpdated(data.last_updated);
      console.log("Stations received:", data.stations.length);

    } catch (error) {
      console.error("API Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle city search from HeroSection
  const handleSearchFromHero = (city: string) => {
    // Don't filter by fuels - get all stations (like the original implementation)
    const query = `city=${encodeURIComponent(city)}&sort=${DEFAULT_SORT}`;
    doSearch(query);
    
    // Scroll to the CityAverages section
    setTimeout(() => {
      const cityAveragesElement = document.querySelector('.max-w-6xl.mx-auto.px-4.mt-8');
      if (cityAveragesElement) {
        cityAveragesElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // Handle refresh
  const handleRefresh = () => {
    if (!currentCity) return;
    setRefreshing(true);
    // Don't filter by fuels - get all stations
    const query = `city=${encodeURIComponent(currentCity)}&sort=${DEFAULT_SORT}`;
    doSearch(query).finally(() => setRefreshing(false));
  };

  // Show hero only state before first search
  const showEmptyState = !hasSearched;

  return (
    <div className="min-h-screen bg-background pb-16">
      <HeroSection onSearch={handleSearchFromHero} />

      {/* Chart - always show */}
      {isLoading ? (
        <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
          <ChartSkeleton />
        </section>
      ) : (
        <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
          <YearlyChart />
        </section>
      )}

      {/* Content - only show after search */}
      {showEmptyState ? (
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Caută un oraș pentru a vedea prețurile combustibililor</p>
        </div>
      ) : (
        <>
          {/* Today's prices - Real data from API */}
          <section className="max-w-6xl mx-auto px-4 mt-12">
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

          {/* Stations section - Real data from API */}
          <section className="max-w-6xl mx-auto px-4 mt-8">
            {isLoading || stations.length === 0 ? (
              <StationListSkeleton />
            ) : stations.length > 0 ? (
              <div className="space-y-4">
                {stations.map((station, index) => (
                  <StationCard
                    key={station.name + index}
                    station={station}
                    cheapestPrice={0}
                    isOverallCheapest={false}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nu s-au găsit stații în această zonă</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default Index;
