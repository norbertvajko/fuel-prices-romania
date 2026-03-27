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

        // Dark blue/black modern tile style
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: "abcd",
            maxZoom: 19,
        }).addTo(map);

        // Glowing blue marker
        const markerIcon = L.divIcon({
            className: "custom-station-marker",
            html: `
        <div style="position:relative;width:44px;height:44px;">
          <div style="
            position:absolute;inset:0;
            border-radius:50%;
            background:radial-gradient(circle,rgba(59,130,246,0.35) 0%,transparent 70%);
            animation:pulse-glow 2s ease-in-out infinite;
          "></div>
          <div style="
            position:absolute;top:6px;left:6px;
            width:32px;height:32px;
            background:linear-gradient(135deg,#3b82f6,#1d4ed8);
            border-radius:50%;
            border:3px solid rgba(255,255,255,0.9);
            box-shadow:0 0 20px rgba(59,130,246,0.6),0 0 40px rgba(59,130,246,0.3);
            display:flex;align-items:center;justify-content:center;
          ">
            <svg style="width:14px;height:14px;color:white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
          background:white;color:#1e293b;border-radius:10px;
          box-shadow:0 4px 16px rgba(0,0,0,0.12);
          border:1px solid #e2e8f0;
        ">
          <strong style="font-size:12px;color:#1e40af;letter-spacing:0.3px">${name}</strong>
          ${network ? `<br/><span style="font-size:10px;color:#64748b">${network}</span>` : ""}
        </div>`,
                { closeButton: false, className: "station-popup", offset: [0, -6] }
            )
            .openPopup();

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
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
          background: white !important;
        }
        .station-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-control-zoom a {
          background: white !important;
          color: #1e40af !important;
          border-color: #e2e8f0 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f1f5f9 !important;
        }
        .leaflet-control-attribution {
  background: transparent !important;
  color: #94a3b8 !important;
  font-size: 9px !important;
  opacity: 0.7;
  padding: 2px 6px !important;
}
        .leaflet-control-attribution a {
          color: #3b82f6 !important;
        }
      `}</style>
        </div>
    );
};

export default StationMap;
