"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink } from "lucide-react";

interface ShopReviewMapProps {
  latitude: number;
  longitude: number;
  shopName: string;
  className?: string;
}

const PIN_ICON_HTML = `
  <div style="position: relative; width: 36px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 0C8.05888 0 0 8.05888 0 18C0 29.5 18 44 18 44C18 44 36 29.5 36 18C36 8.05888 27.9411 0 18 0Z" fill="#12724A"/>
      <path d="M18 2C9.16344 2 2 9.16344 2 18C2 28.2 18 41.5 18 41.5C18 41.5 34 28.2 34 18C34 9.16344 26.8366 2 18 2Z" fill="#3DD68C"/>
      <circle cx="18" cy="17" r="7" fill="#09090b"/>
      <circle cx="18" cy="17" r="3.5" fill="#FBF9F3"/>
    </svg>
  </div>
`;

export default function ShopReviewMap({
  latitude,
  longitude,
  shopName,
  className = "h-72 w-full rounded-2xl overflow-hidden border border-[var(--border)]",
}: ShopReviewMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        scrollWheelZoom: true,
      });

      const tileUrl =
        process.env.NEXT_PUBLIC_MAP_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      const attribution =
        process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

      L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);

      const customIcon = L.divIcon({
        className: "custom-printsafe-pin",
        html: PIN_ICON_HTML,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
      });

      const marker = L.marker([latitude, longitude], {
        icon: customIcon,
      }).addTo(map);
      marker
        .bindPopup(
          `<strong>${shopName}</strong><br/>${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        )
        .openPopup();

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, shopName]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Pin Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
        >
          Open in Google Maps
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <div ref={mapContainerRef} className={className} />
    </div>
  );
}
