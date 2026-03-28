import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface StationMapProps {
    lat: number;
    lon: number;
    name: string;
    network?: string;
}

const StationMap = ({ lat, lon, name, network }: StationMapProps) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const map = L.map(mapRef.current, {
            center: [lat, lon],
            zoom: 14,
            zoomControl: false,
            attributionControl: false,
        });

        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.control.attribution({ position: "bottomleft" }).addTo(map);

        // Use dark or light tiles based on theme
        const isDark = document.documentElement.classList.contains("dark");
        const tileUrl = isDark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

        const tileLayer = L.tileLayer(tileUrl, {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: "abcd",
            maxZoom: 19,
        }).addTo(map);

        tileLayerRef.current = tileLayer;

        // Glowing marker with theme-aware colors
        const markerIcon = L.divIcon({
            className: "custom-station-marker",
            html: `
        <div style="position:relative;width:44px;height:44px;">
          <div style="
            position:absolute;inset:0;
            border-radius:50%;
            background:radial-gradient(circle,hsl(var(--foreground) / 0.35) 0%,transparent 70%);
            animation:pulse-glow 2s ease-in-out infinite;
          "></div>
          <div style="
            position:absolute;top:6px;left:6px;
            width:32px;height:32px;
            background:linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary) / 0.8));
            border-radius:50%;
            border:3px solid hsl(var(--background));
            box-shadow:0 0 20px hsl(var(--foreground) / 0.6),0 0 40px hsl(var(--foreground) / 0.3);
            display:flex;align-items:center;justify-content:center;
          ">
            <svg style="width:14px;height:14px;color:hsl(var(--primary-foreground))" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
        </div>
      `,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -22],
        });

        L.marker([lat, lon], { icon: markerIcon })
            .addTo(map)
            .bindPopup(
                `<div style="
          font-family:system-ui;text-align:center;padding:8px 12px;
          background:hsl(var(--card));
          color:hsl(var(--card-foreground));
          border-radius:10px;
          box-shadow:0 4px 16px rgba(0,0,0,0.12);
          border:1px solid hsl(var(--border));
        ">
          <strong style="font-size:12px;color:hsl(var(--foreground));letter-spacing:0.3px">${name}</strong>
          ${network ? `<br/><span style="font-size:10px;color:hsl(var(--muted-foreground))">${network}</span>` : ""}
        </div>`,
                { closeButton: false, className: "station-popup", offset: [0, -6] }
            )
            .openPopup();

        mapInstanceRef.current = map;

        // Listen for theme changes
        const observer = new MutationObserver(() => {
            const isDark = document.documentElement.classList.contains("dark");
            const newTileUrl = isDark
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

            if (tileLayerRef.current) {
                tileLayerRef.current.setUrl(newTileUrl);
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => {
            observer.disconnect();
            map.remove();
            mapInstanceRef.current = null;
            tileLayerRef.current = null;
        };
    }, [lat, lon, name, network]);

    return (
        <div className="relative w-full overflow-hidden rounded-xl border border-border shadow-md">
            <div ref={mapRef} className="h-[220px] w-full" />

            <style>{`
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.4; }
        }
        .station-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
        }
        .station-popup .leaflet-popup-tip {
          background: hsl(var(--card)) !important;
        }
        .station-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-control-zoom a {
          background: hsl(var(--card)) !important;
          color: hsl(var(--foreground)) !important;
          border-color: hsl(var(--border)) !important;
        }
        .leaflet-control-zoom a:hover {
          background: hsl(var(--accent)) !important;
        }
        .leaflet-control-attribution {
          background: transparent !important;
          color: hsl(var(--muted-foreground)) !important;
          font-size: 9px !important;
          opacity: 0.7;
          padding: 2px 6px !important;
        }
        .leaflet-control-attribution a {
          color: hsl(var(--foreground)) !important;
        }
        .dark .leaflet-tile-pane {
          filter: brightness(1.2) contrast(1.1);
        }
      `}</style>
        </div>
    );
};

export default StationMap;
