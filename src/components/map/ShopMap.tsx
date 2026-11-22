"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyShopDetail } from "@/lib/db/queries";

export interface ShopMapProps {
  userLocation: { lat: number; lng: number } | null;
  shops: NearbyShopDetail[];
  selectedShopId: string | null;
  onSelectShop: (shop: NearbyShopDetail) => void;
  className?: string;
}

const LIVE_PIN_HTML = (isSelected: boolean) => `
  <div style="position: relative; width: ${isSelected ? "42px" : "36px"}; height: ${isSelected ? "50px" : "44px"}; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35)); cursor: pointer; transition: transform 0.2s ease;">
    <svg width="${isSelected ? "42" : "36"}" height="${isSelected ? "50" : "44"}" viewBox="0 0 36 44" fill="none">
      <path d="M18 0C8.05888 0 0 8.05888 0 18C0 29.5 18 44 18 44C18 44 36 29.5 36 18C36 8.05888 27.9411 0 18 0Z" fill="${isSelected ? "#0A4A2F" : "#12724A"}"/>
      <path d="M18 2C9.16344 2 2 9.16344 2 18C2 28.2 18 41.5 18 41.5C18 41.5 34 28.2 34 18C34 9.16344 26.8366 2 18 2Z" fill="${isSelected ? "#5AF3A7" : "#3DD68C"}"/>
      <circle cx="18" cy="17" r="${isSelected ? "8" : "7"}" fill="#09090b"/>
      <circle cx="18" cy="17" r="3.5" fill="#3DD68C"/>
    </svg>
    <div class="animate-pin-pulse" style="position: absolute; top: ${isSelected ? "14px" : "12px"}; left: ${isSelected ? "16px" : "13px"}; width: 10px; height: 10px; border-radius: 9999px;"></div>
  </div>
`;

const CLOSED_PIN_HTML = (isSelected: boolean) => `
  <div style="position: relative; width: ${isSelected ? "38px" : "32px"}; height: ${isSelected ? "46px" : "40px"}; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25)); opacity: 0.8; cursor: pointer;">
    <svg width="${isSelected ? "38" : "32"}" height="${isSelected ? "46" : "40"}" viewBox="0 0 36 44" fill="none">
      <path d="M18 0C8.05888 0 0 8.05888 0 18C0 29.5 18 44 18 44C18 44 36 29.5 36 18C36 8.05888 27.9411 0 18 0Z" fill="#334155"/>
      <path d="M18 2C9.16344 2 2 9.16344 2 18C2 28.2 18 41.5 18 41.5C18 41.5 34 28.2 34 18C34 9.16344 26.8366 2 18 2Z" fill="#64748B"/>
      <circle cx="18" cy="17" r="6" fill="#0F172A"/>
    </svg>
  </div>
`;

const USER_LOCATION_HTML = `
  <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
    <div class="animate-user-pulse" style="width: 18px; height: 18px; background-color: #5B8DEF; border: 3px solid #FFFFFF; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
  </div>
`;

export default function ShopMap({
  userLocation,
  shops,
  selectedShopId,
  onSelectShop,
  className = "w-full h-full",
}: ShopMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelectShop);
  const initialCenterRef = useRef<[number, number]>(
    userLocation ? [userLocation.lat, userLocation.lng] : [12.9716, 77.5946] // Bangalore default
  );

  useEffect(() => {
    onSelectRef.current = onSelectShop;
  }, [onSelectShop]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let resizeObserver: ResizeObserver | null = null;
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    let t3: NodeJS.Timeout;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialCenterRef.current,
        zoom: 14,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Invalidate size on container dimension change to eliminate tile glitching
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);

      t1 = setTimeout(() => map.invalidateSize(), 50);
      t2 = setTimeout(() => map.invalidateSize(), 200);
      t3 = setTimeout(() => map.invalidateSize(), 600);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Update User Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      const userIcon = L.divIcon({
        className: "custom-user-pin",
        html: USER_LOCATION_HTML,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // 3. Render Shop Pins & Clusters
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds = L.latLngBounds([]);
    if (userLocation) {
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    for (const shop of shops) {
      if (shop.latitude == null || shop.longitude == null) continue;

      const isSelected = shop.id === selectedShopId;
      const html = shop.isLive
        ? LIVE_PIN_HTML(isSelected)
        : CLOSED_PIN_HTML(isSelected);

      const pinIcon = L.divIcon({
        className: `custom-shop-pin-${shop.id}`,
        html,
        iconSize: isSelected ? [42, 50] : [36, 44],
        iconAnchor: isSelected ? [21, 50] : [18, 44],
      });

      const marker = L.marker([shop.latitude, shop.longitude], {
        icon: pinIcon,
        zIndexOffset: isSelected ? 500 : shop.isLive ? 200 : 100,
      });

      marker.on("click", () => {
        onSelectRef.current(shop);
      });

      marker.addTo(layer);
      bounds.extend([shop.latitude, shop.longitude]);
    }

    // Adjust map viewport to show pins on first load or when user moves
    if (bounds.isValid() && shops.length > 0 && !selectedShopId) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [shops, selectedShopId, userLocation]);

  // 4. Pan to Selected Shop
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedShopId) return;

    const selected = shops.find((s) => s.id === selectedShopId);
    if (selected && selected.latitude != null && selected.longitude != null) {
      map.flyTo([selected.latitude, selected.longitude], 16, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedShopId, shops]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
