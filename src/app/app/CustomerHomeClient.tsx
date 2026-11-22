"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  MapPin,
  Search,
  Navigation,
  Compass,
  Phone,
  ExternalLink,
  Bell,
  RotateCw,
  List,
  Map as MapIcon,
  AlertCircle,
  Printer,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Card3D, Button3D, Badge, Modal } from "@/components/ui";
import { ShopMap } from "@/components/map";
import { FootprintTreeCard, FootprintTree } from "@/components/tree";
import type { NearbyShopDetail } from "@/lib/db/queries";
import type { PlaceSearchResult } from "@/lib/geo/search";

interface CustomerHomeClientProps {
  userAlias?: string;
  initialSheetsPrintedTotal?: number;
  initialHasNoPrintsLast30Days?: boolean;
}

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore default
const STORAGE_KEY = "printsafe_user_location";

function getInitialLocation(): {
  lat: number;
  lng: number;
  name?: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function CustomerHomeClient({
  userAlias = "Customer A7F2",
  initialSheetsPrintedTotal = 0,
  initialHasNoPrintsLast30Days = false,
}: CustomerHomeClientProps) {
  // Footprint Tree states (Phase 14)
  const [sheetsPrintedTotal, setSheetsPrintedTotal] = useState(
    initialSheetsPrintedTotal
  );
  const [hasNoPrintsLast30Days, setHasNoPrintsLast30Days] = useState(
    initialHasNoPrintsLast30Days
  );
  const [showTreeModal, setShowTreeModal] = useState(false);

  // Location states
  const [userLocation, setUserLocation] = useState(getInitialLocation);
  const [showLocationModal, setShowLocationModal] = useState(
    () => !getInitialLocation()
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Shop states
  const [shops, setShops] = useState<NearbyShopDetail[]>([]);
  const [selectedShop, setSelectedShop] = useState<NearbyShopDetail | null>(
    null
  );
  const [isLoadingShops, setIsLoadingShops] = useState(false);
  const [radiusM, setRadiusM] = useState(5000); // 5 km default
  const [includeClosed, setIncludeClosed] = useState(false);

  // View mode & Mobile Sheet
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [notifySubscribed, setNotifySubscribed] = useState(false);

  // Live Footprint Refresh (Phase 14)
  useEffect(() => {
    let ignore = false;
    async function loadFootprint() {
      try {
        const res = await fetch("/api/customer/footprint");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            if (typeof data.sheetsPrintedTotal === "number") {
              setSheetsPrintedTotal(data.sheetsPrintedTotal);
            }
            if (typeof data.hasNoPrintsLast30Days === "boolean") {
              setHasNoPrintsLast30Days(data.hasNoPrintsLast30Days);
            }
          }
        }
      } catch {}
    }
    loadFootprint();
    return () => {
      ignore = true;
    };
  }, []);

  // 1. Reactive Fetch on Location / Radius / IncludeClosed changes
  useEffect(() => {
    const loc = userLocation;
    if (!loc) return;
    let cancelled = false;

    async function load() {
      if (!loc) return;
      try {
        const url = new URL("/api/shops/nearby", window.location.origin);
        url.searchParams.set("lat", loc.lat.toString());
        url.searchParams.set("lng", loc.lng.toString());
        url.searchParams.set("radius", radiusM.toString());
        if (includeClosed) {
          url.searchParams.set("includeClosed", "true");
        }

        const res = await fetch(url.toString());
        if (res.ok && !cancelled) {
          const data = await res.json();
          setShops(data.shops || []);
        }
      } catch (err) {
        console.warn("Failed to load nearby shops:", err);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userLocation, radiusM, includeClosed]);

  // 2. Manual and polling refresh function
  const refreshShops = useCallback(async () => {
    if (!userLocation) return;

    try {
      setIsLoadingShops(true);
      const url = new URL("/api/shops/nearby", window.location.origin);
      url.searchParams.set("lat", userLocation.lat.toString());
      url.searchParams.set("lng", userLocation.lng.toString());
      url.searchParams.set("radius", radiusM.toString());
      if (includeClosed) {
        url.searchParams.set("includeClosed", "true");
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setShops(data.shops || []);
      }
    } catch (err) {
      console.warn("Failed to load nearby shops:", err);
    } finally {
      setIsLoadingShops(false);
    }
  }, [userLocation, radiusM, includeClosed]);

  // 3. Live 15s Polling while tab is visible
  useEffect(() => {
    if (!userLocation) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshShops();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [userLocation, refreshShops]);

  // 4. Request Browser Geolocation
  function handleRequestLocation() {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: "Current Location",
        };
        setUserLocation(loc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
        } catch {}
        setIsLocating(false);
        setShowLocationModal(false);
      },
      (err) => {
        console.warn("Geolocation denied or unavailable:", err.message);
        setLocationError(
          "Location access was denied. You can search your area or landmark below."
        );
        setIsLocating(false);
        // Fall back to default location
        const defaultLoc = { ...DEFAULT_CENTER, name: "Bangalore Central" };
        setUserLocation(defaultLoc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLoc));
        } catch {}
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // 5. Debounced Place Search
  function handleSearchInputChange(val: string) {
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/geo/search?q=${encodeURIComponent(val.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setShowSearchResults(true);
        }
      } catch (err) {
        console.warn("Search place failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }

  function handleSelectPlace(place: PlaceSearchResult) {
    const loc = {
      lat: place.lat,
      lng: place.lng,
      name: place.locality || place.city || place.displayName.split(",")[0],
    };
    setUserLocation(loc);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {}
    setSearchQuery("");
    setShowSearchResults(false);
    setShowLocationModal(false);
  }

  // Format distance
  function formatDistance(m: number): string {
    if (m < 1000) {
      return `${Math.round(m)} m away`;
    }
    return `${(m / 1000).toFixed(1)} km away`;
  }

  return (
    <CustomerShell userAlias={userAlias}>
      <div className="relative flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[var(--bg)]">
        {/* Top Floating Control Bar */}
        <div className="z-20 p-3 sm:p-4 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
          {/* Location & Search Combo */}
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchResults(true);
                }}
                placeholder={
                  userLocation?.name
                    ? `Near ${userLocation.name}... Search landmark`
                    : "Search landmark, college, or area..."
                }
                className="w-full h-10 pl-9 pr-8 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              {isSearching ? (
                <Loader2 className="absolute right-2.5 w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
              ) : searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchResults(false);
                  }}
                  className="absolute right-2.5 text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Search Dropdown Results */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-50 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                {searchResults.map((place, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPlace(place)}
                    className="w-full p-2.5 text-left text-xs border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors flex items-start gap-2.5"
                  >
                    <MapPin className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                    <div className="truncate">
                      <p className="font-bold text-[var(--text)] truncate">
                        {place.locality || place.city || place.displayName}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {place.displayName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Controls: Radius, Closed Toggle, Locate Button, Mode */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Radius Selector */}
            <select
              value={radiusM}
              onChange={(e) => setRadiusM(parseInt(e.target.value, 10))}
              className="h-9 px-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--text)] focus:outline-none"
            >
              <option value={1000}>Within 1 km</option>
              <option value={3000}>Within 3 km</option>
              <option value={5000}>Within 5 km</option>
              <option value={10000}>Within 10 km</option>
            </select>

            {/* Show Closed Toggle */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--border)]">
              <label
                htmlFor="toggle-closed"
                className="text-[11px] font-bold text-[var(--text-muted)] select-none hidden sm:inline"
              >
                Closed Shops
              </label>
              <button
                id="toggle-closed"
                onClick={() => setIncludeClosed(!includeClosed)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  includeClosed
                    ? "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]"
                    : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {includeClosed ? "Showing All" : "Live Only"}
              </button>
            </div>

            {/* Locate Me Button */}
            <button
              onClick={handleRequestLocation}
              disabled={isLocating}
              className="h-9 w-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all"
              title="Use Current Location"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
              ) : (
                <Compass className="w-4 h-4" />
              )}
            </button>

            {/* View Mode Switcher (Accessible list alternative) */}
            <div className="flex items-center bg-[var(--surface-2)] p-0.5 rounded-xl border border-[var(--border)]">
              <button
                onClick={() => setViewMode("map")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                  viewMode === "map"
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                title="Map View"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Map</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                  viewMode === "list"
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline">List</span>
              </button>
            </div>

            {/* Paper Footprint Button (Phase 14) */}
            <Button3D
              variant="outline"
              size="sm"
              onClick={() => setShowTreeModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="View Paper Footprint Tree"
            >
              <span className="text-sm">🌳</span>
              <span className="hidden sm:inline">Footprint</span>
            </Button3D>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative flex-1 flex overflow-hidden">
          {/* Desktop Left Side Panel (List & Details) */}
          <div className="hidden lg:flex flex-col w-[400px] border-r border-[var(--border)] bg-[var(--surface)] overflow-hidden shrink-0 z-10">
            {/* Paper Footprint Summary Banner in Sidebar */}
            <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-2)]/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🌳</span>
                <div>
                  <p className="text-xs font-bold text-[var(--text)]">
                    {sheetsPrintedTotal}{" "}
                    {sheetsPrintedTotal === 1 ? "sheet" : "sheets"} printed
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Paper footprint tree
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTreeModal(true)}
                className="text-[11px] text-[var(--accent)] font-bold hover:underline"
              >
                View Tree &rarr;
              </button>
            </div>
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-[var(--text)]">
                  Print Shops Nearby
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {shops.length}{" "}
                  {shops.length === 1 ? "storefront" : "storefronts"} found
                  &bull; Auto-refreshes every 15s
                </p>
              </div>
              <button
                onClick={refreshShops}
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-1.5 rounded-lg"
                title="Refresh Live Status"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 ${isLoadingShops ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingShops && shops.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)] mx-auto" />
                  <p className="text-xs text-[var(--text-muted)]">
                    Locating verified copy shops...
                  </p>
                </div>
              ) : shops.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-[var(--warm)] mx-auto opacity-70" />
                  <h3 className="text-xs font-bold text-[var(--text)]">
                    No Live Shops Found
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    No verified print shops are online within{" "}
                    {radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`}.
                  </p>
                  <Button3D
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setRadiusM(10000);
                      setIncludeClosed(true);
                    }}
                    className="w-full text-xs"
                  >
                    Expand Search to 10 km
                  </Button3D>

                  <div className="pt-3 border-t border-[var(--border)]">
                    <button
                      onClick={() => setNotifySubscribed(true)}
                      disabled={notifySubscribed}
                      className="text-[11px] text-[var(--accent)] font-bold flex items-center justify-center gap-1.5 mx-auto hover:underline"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {notifySubscribed
                        ? "Notification set for when a shop goes Live!"
                        : "Notify me when a shop opens"}
                    </button>
                  </div>
                </div>
              ) : (
                shops.map((shop) => (
                  <ShopListItemCard
                    key={shop.id}
                    shop={shop}
                    isSelected={selectedShop?.id === shop.id}
                    onSelect={() => setSelectedShop(shop)}
                    formatDistance={formatDistance}
                  />
                ))
              )}
            </div>

            {/* Selected Shop Floating Drawer at Bottom of Panel */}
            {selectedShop && (
              <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)] space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--text)]">
                      {selectedShop.name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {selectedShop.locality || selectedShop.city} &bull;{" "}
                      {formatDistance(selectedShop.distanceMeters)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedShop(null)}
                    className="text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedShop.isLive ? "live" : "offline"}
                    size="sm"
                  >
                    {selectedShop.isLive ? "Open & Live" : "Closed"}
                  </Badge>
                  {selectedShop.capacityState === "busy" && (
                    <Badge variant="neutral" size="sm">
                      Busy (5+ in queue)
                    </Badge>
                  )}
                  {selectedShop.capacityState === "at_capacity" && (
                    <Badge variant="rejected" size="sm">
                      At Capacity
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[var(--surface)] p-2.5 rounded-xl border border-[var(--border)]">
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">
                      B&amp;W Page
                    </span>
                    <span className="font-extrabold font-mono text-[var(--text)]">
                      ₹{(selectedShop.priceBwPaise / 100).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">
                      Colour Page
                    </span>
                    <span className="font-extrabold font-mono text-[var(--text)]">
                      ₹{(selectedShop.priceColorPaise / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedShop.latitude},${selectedShop.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button3D
                      variant="secondary"
                      size="sm"
                      className="w-full flex items-center justify-center gap-1.5 text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Directions
                    </Button3D>
                  </a>

                  {selectedShop.phone && (
                    <a href={`tel:${selectedShop.phone}`} className="shrink-0">
                      <Button3D
                        variant="secondary"
                        size="sm"
                        className="flex items-center justify-center text-xs"
                        title="Call Print Shop"
                      >
                        <Phone className="w-3.5 h-3.5 text-[var(--accent)]" />
                      </Button3D>
                    </a>
                  )}

                  <Link
                    href={`/app/jobs/new?shop=${selectedShop.id}`}
                    className="flex-1"
                  >
                    <Button3D
                      variant="primary"
                      size="sm"
                      disabled={
                        !selectedShop.isLive ||
                        selectedShop.capacityState === "at_capacity"
                      }
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Request Print
                    </Button3D>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Map View / Mobile Sheet Container */}
          <div className="relative flex-1 h-full w-full">
            {viewMode === "map" ? (
              <ShopMap
                userLocation={userLocation}
                shops={shops}
                selectedShopId={selectedShop?.id || null}
                onSelectShop={(shop) => {
                  setSelectedShop(shop);
                  setIsSheetExpanded(true);
                }}
                className="w-full h-full"
              />
            ) : (
              /* Accessible Pure List View Alternative */
              <div className="w-full h-full p-4 sm:p-6 overflow-y-auto max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">
                    Nearby Print Shops List ({shops.length})
                  </h2>
                  <Badge variant="live" size="sm">
                    Accessible List
                  </Badge>
                </div>

                {/* Paper Footprint Card (Phase 14) */}
                <FootprintTreeCard
                  sheetsPrintedTotal={sheetsPrintedTotal}
                  hasNoPrintsLast30Days={hasNoPrintsLast30Days}
                />

                {shops.length === 0 ? (
                  <Card3D className="p-8 text-center space-y-3">
                    <p className="text-xs text-[var(--text-muted)]">
                      No shops match your current radius.
                    </p>
                  </Card3D>
                ) : (
                  shops.map((shop) => (
                    <Card3D key={shop.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-[var(--text)]">
                            {shop.name}
                          </h3>
                          <p className="text-xs text-[var(--text-muted)]">
                            {shop.addressLine}, {shop.locality || shop.city}
                          </p>
                        </div>
                        <Badge
                          variant={shop.isLive ? "live" : "offline"}
                          size="sm"
                        >
                          {shop.isLive ? "Open" : "Closed"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span>
                          B&amp;W: ₹{(shop.priceBwPaise / 100).toFixed(2)}
                        </span>
                        <span>
                          Colour: ₹{(shop.priceColorPaise / 100).toFixed(2)}
                        </span>
                        <span className="text-[var(--text-muted)]">
                          {formatDistance(shop.distanceMeters)}
                        </span>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <Link href={`/app/jobs/new?shop=${shop.id}`}>
                          <Button3D
                            variant="primary"
                            size="sm"
                            disabled={
                              !shop.isLive ||
                              shop.capacityState === "at_capacity"
                            }
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Request Print
                          </Button3D>
                        </Link>
                      </div>
                    </Card3D>
                  ))
                )}
              </div>
            )}

            {/* Mobile Bottom Sheet (Draggable / Collapsible) */}
            <div className="lg:hidden absolute left-0 right-0 bottom-0 z-30 bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl shadow-2xl transition-all duration-300">
              <button
                onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                className="w-full py-2.5 flex flex-col items-center justify-center cursor-pointer select-none"
              >
                <div className="w-10 h-1 bg-[var(--border)] rounded-full mb-1" />
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text)]">
                  <span>
                    {selectedShop
                      ? selectedShop.name
                      : `${shops.length} Nearby Shops`}
                  </span>
                  {isSheetExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  )}
                </div>
              </button>

              {/* Sheet Body */}
              <div
                className={`overflow-y-auto px-4 pb-6 transition-all duration-300 ${
                  isSheetExpanded ? "max-h-[60vh]" : "max-h-24"
                }`}
              >
                {selectedShop ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {formatDistance(selectedShop.distanceMeters)} &bull;{" "}
                        {selectedShop.locality || selectedShop.city}
                      </span>
                      <Badge
                        variant={selectedShop.isLive ? "live" : "offline"}
                        size="sm"
                      >
                        {selectedShop.isLive ? "Live" : "Closed"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--surface-2)] p-2 rounded-xl">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">
                          B&amp;W
                        </span>
                        <span className="font-extrabold font-mono">
                          ₹{(selectedShop.priceBwPaise / 100).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">
                          Colour
                        </span>
                        <span className="font-extrabold font-mono">
                          ₹{(selectedShop.priceColorPaise / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedShop.latitude},${selectedShop.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button3D
                          variant="secondary"
                          size="sm"
                          className="w-full text-xs"
                        >
                          Directions
                        </Button3D>
                      </a>
                      <Link
                        href={`/app/jobs/new?shop=${selectedShop.id}`}
                        className="flex-1"
                      >
                        <Button3D
                          variant="primary"
                          size="sm"
                          disabled={!selectedShop.isLive}
                          className="w-full text-xs font-bold"
                        >
                          Request Print
                        </Button3D>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {shops.slice(0, 5).map((shop) => (
                      <div
                        key={shop.id}
                        onClick={() => setSelectedShop(shop)}
                        className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <p className="font-bold text-[var(--text)]">
                            {shop.name}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {formatDistance(shop.distanceMeters)} &bull; ₹
                            {(shop.priceBwPaise / 100).toFixed(2)} / page
                          </p>
                        </div>
                        <Badge
                          variant={shop.isLive ? "live" : "offline"}
                          size="sm"
                        >
                          {shop.isLive ? "Live" : "Closed"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Location Permission Explanation Modal */}
        <Modal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          title="Find Nearby Print Shops"
        >
          <div className="space-y-4 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-fill)]/20 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] mx-auto extrude-sm">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-[var(--text)]">
                Enable Location to Find Shops Nearby
              </h3>
              <p className="text-[var(--text-muted)] leading-relaxed">
                PrintSafe locates live xerox and copy shops within walking
                distance of you. Your location is used only in your browser and
                is never saved to our servers.
              </p>
            </div>

            {locationError && (
              <div className="p-3 rounded-xl bg-[var(--warm)]/15 border border-[var(--warm)] text-[var(--warm)] font-medium">
                {locationError}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Button3D
                variant="primary"
                size="md"
                onClick={handleRequestLocation}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 font-bold"
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Compass className="w-4 h-4" />
                )}
                {isLocating ? "Getting Location..." : "Share My Location"}
              </Button3D>

              <Button3D
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowLocationModal(false);
                  const defaultLoc = {
                    ...DEFAULT_CENTER,
                    name: "Bangalore Central",
                  };
                  setUserLocation(defaultLoc);
                }}
                className="w-full"
              >
                Continue with Default Area
              </Button3D>
            </div>
          </div>
        </Modal>

        {/* Paper Footprint Tree Modal (Phase 14) */}
        <Modal
          isOpen={showTreeModal}
          onClose={() => setShowTreeModal(false)}
          title="Paper Footprint Tree"
          className="max-w-md"
        >
          <div className="p-2">
            <FootprintTree
              sheetsPrintedTotal={sheetsPrintedTotal}
              hasNoPrintsLast30Days={hasNoPrintsLast30Days}
            />
          </div>
        </Modal>
      </div>
    </CustomerShell>
  );
}

function ShopListItemCard({
  shop,
  isSelected,
  onSelect,
  formatDistance,
}: {
  shop: NearbyShopDetail;
  isSelected: boolean;
  onSelect: () => void;
  formatDistance: (m: number) => string;
}) {
  return (
    <Card3D
      onClick={onSelect}
      className={`p-3.5 cursor-pointer transition-all border ${
        isSelected
          ? "border-[var(--accent)] bg-[var(--surface-2)] shadow-md"
          : "border-[var(--border)] hover:border-[var(--accent)]/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="truncate">
          <h3 className="text-xs font-bold text-[var(--text)] truncate">
            {shop.name}
          </h3>
          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
            {shop.addressLine}, {shop.locality || shop.city}
          </p>
        </div>
        <Badge variant={shop.isLive ? "live" : "offline"} size="sm">
          {shop.isLive ? "Live" : "Closed"}
        </Badge>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)] text-[11px]">
        <span className="text-[var(--text-muted)] font-mono">
          {formatDistance(shop.distanceMeters)}
        </span>
        <div className="flex items-center gap-2 font-mono font-bold text-[var(--text)]">
          <span>B&amp;W: ₹{(shop.priceBwPaise / 100).toFixed(2)}</span>
          <span className="text-[var(--text-muted)]">&bull;</span>
          <span>Col: ₹{(shop.priceColorPaise / 100).toFixed(2)}</span>
        </div>
      </div>
    </Card3D>
  );
}
