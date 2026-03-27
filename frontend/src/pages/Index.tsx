import { useState, useCallback, useRef } from "react";
import HeroSection from "../components/HeroSection";
import YearlyChart from "../components/YearlyChart";
import CityAverages from "../components/CityAverages";
import StationCard from "../components/StationCard";
import { ChartSkeleton, StationListSkeleton, TodayPricesSkeleton } from "../components/Skeletons";
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
  const stationsRef = useRef<HTMLDivElement>(null);
  const firstStationCardRef = useRef<HTMLDivElement>(null);

  // Track last known city for skeleton display
  const [lastCity, setLastCity] = useState<string | undefined>(undefined);

  // Fetch data from your own API (not external API)
  const doSearch = useCallback(async (city: string) => {
    setIsLoading(true);
    setStations([]);
    setHasSearched(true);
    setLastCity(city);

    try {
      // Call your own /stations endpoint instead of external API
      const res = await fetch(`${API_URL}/stations?city=${encodeURIComponent(city)}`);
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
  const handleSearchFromHero = (city: string) => {
    doSearch(city);

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
    <div className="flex flex-col bg-background overflow-hidden">
      {/* Show loader until chart is loaded */}
      {!isChartLoaded && (
        <FuelLoader onComplete={() => setIsChartLoaded(true)} progress={chartProgress} />
      )}

      <HeroSection onSearch={handleSearchFromHero} />

      {/* Chart - always show */}
      {isLoading ? (
        <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
          <ChartSkeleton />
        </section>
      ) : (
        <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
          <YearlyChart
            onLoadingComplete={() => setIsChartLoaded(true)}
            onProgress={(progress) => setChartProgress(progress)}
          />
        </section>
      )}
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
      <section ref={stationsRef} className="max-w-6xl mx-auto px-4 mt-8">
        {isLoading ? (
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
                ref={index === 0 ? firstStationCardRef : null}
              />
            ))}
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
