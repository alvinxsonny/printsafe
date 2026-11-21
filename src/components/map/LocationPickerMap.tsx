"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Loader2 } from "lucide-react";
import { Button3D } from "@/components/ui/Button3D";

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

const PIN_ICON_HTML = `
  <div style="position: relative; width: 36px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 0C8.05888 0 0 8.05888 0 18C0 29.5 18 44 18 44C18 44 36 29.5 36 18C36 8.05888 27.9411 0 18 0Z" fill="#12724A"/>
      <path d="M18 2C9.16344 2 2 9.16344 2 18C2 28.2 18 41.5 18 41.5C18 41.5 34 28.2 34 18C34 9.16344 26.8366 2 18 2Z" fill="#3DD68C"/>
      <circle cx="18" cy="17" r="7" fill="#14213D"/>
      <circle cx="18" cy="17" r="3.5" fill="#FBF9F3"/>
    </svg>
  </div>
`;

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  className = "h-80 w-full rounded-2xl overflow-hidden border border-[var(--border)]",
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const customIcon = L.divIcon({
      className: "custom-printsafe-pin",
      html: PIN_ICON_HTML,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
    });

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

      const marker = L.marker([latitude, longitude], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", (e: L.LeafletEvent) => {
        const targetMarker = e.target as L.Marker;
        const position = targetMarker.getLatLng();
        onChangeRef.current(position.lat, position.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync position updates if props change
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - latitude) > 0.00001 ||
        Math.abs(currentPos.lng - longitude) > 0.00001
      ) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView(
          [latitude, longitude],
          mapInstanceRef.current.getZoom()
        );
      }
    }
  }, [latitude, longitude]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1`;
      const res = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "PrintSafe-LocationPicker/1.0",
        },
      });

      if (!res.ok) throw new Error("Place lookup request failed");
      const results = await res.json();

      if (results && results.length > 0) {
        const item = results[0];
        const newLat = parseFloat(item.lat);
        const newLng = parseFloat(item.lon);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 17);
          markerRef.current.setLatLng([newLat, newLng]);
        }
        onChange(newLat, newLng);
      } else {
        setSearchError("No locations found. Drag the pin directly on the map.");
      }
    } catch {
      setSearchError(
        "Search failed. You can drag the pin directly on the map."
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search address or landmark to position pin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 px-3 pl-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3.5" />
        </div>
        <Button3D
          type="submit"
          variant="secondary"
          size="sm"
          disabled={isSearching}
          className="shrink-0"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Find Place"
          )}
        </Button3D>
      </form>

      {searchError && (
        <p className="text-xs text-[var(--danger)]">{searchError}</p>
      )}

      <div className="relative">
        <div
          ref={mapContainerRef}
          className={className}
          style={{ minHeight: "320px" }}
        />
        <div className="absolute bottom-2 left-2 z-[400] bg-[var(--surface)]/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-[var(--border)] text-[11px] font-medium text-[var(--text-muted)] pointer-events-none">
          Drag pin to refine exact storefront entrance
        </div>
      </div>
    </div>
  );
}
