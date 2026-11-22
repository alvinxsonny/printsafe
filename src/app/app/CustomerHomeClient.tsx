"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  MapPin,
  Search,
  Navigation,
  Compass,
  ExternalLink,
  RotateCw,
  AlertCircle,
  Printer,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
  TreePine,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Card3D, Button3D, Badge, Modal } from "@/components/ui";
import { ShopMap } from "@/components/map";
import { FootprintTree } from "@/components/tree";
import type { NearbyShopDetail } from "@/lib/db/queries";
import type { PlaceSearchResult } from "@/lib/geo/search";

interface CustomerHomeClientProps {
  userAlias?: string;
  initialSheetsPrintedTotal?: number;
  initialHasNoPrintsLast30Days?: boolean;
}

const STORAGE_KEY = "printsafe_user_location";
const emptySubscribe = () => () => {};

function getSavedLocation(): {
  lat: number;
  lng: number;
  name?: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        typeof parsed.lat === "number" &&
        typeof parsed.lng === "number" &&
        parsed.name !== "Bangalore Central"
      ) {
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
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Footprint Tree states
  const [sheetsPrintedTotal, setSheetsPrintedTotal] = useState(
    initialSheetsPrintedTotal
  );
  const [hasNoPrintsLast30Days, setHasNoPrintsLast30Days] = useState(
    initialHasNoPrintsLast30Days
  );
  const [showTreeModal, setShowTreeModal] = useState(false);

  // Mandatory Location states
  const [customLocation, setCustomLocation] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  const userLocation =
    customLocation ?? (isMounted ? getSavedLocation() : null);

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showChangeLocationModal, setShowChangeLocationModal] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Shop states & Infographic Filter
  const [shops, setShops] = useState<NearbyShopDetail[]>([]);
  const [selectedShop, setSelectedShop] = useState<NearbyShopDetail | null>(
    null
  );
  const [isLoadingShops, setIsLoadingShops] = useState(false);
  const [radiusM, setRadiusM] = useState(5000); // 5 km default
  const [includeClosed, setIncludeClosed] = useState(false);
  const [partnerFilter, setPartnerFilter] = useState<
    "all" | "joined" | "unclaimed"
  >("all");

  // UI Layout
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  // Live Footprint Refresh
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
    if (!userLocation) return;
    let cancelled = false;

    async function load() {
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
        if (res.ok && !cancelled) {
          const data = await res.json();
          setShops(data.shops || []);
        }
      } catch (err) {
        console.warn("Failed to load nearby shops:", err);
      } finally {
        if (!cancelled) setIsLoadingShops(false);
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
          name: "My GPS Location",
        };
        setCustomLocation(loc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
        } catch {}
        setIsLocating(false);
        setShowChangeLocationModal(false);
      },
      (err) => {
        console.warn("Geolocation denied or unavailable:", err.message);
        setLocationError(
          "Location access was blocked. Please click the site settings / lock icon in your browser address bar, set Location to 'Allow', and try again."
        );
        setIsLocating(false);
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 0 }
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
    setCustomLocation(loc);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {}
    setSearchQuery("");
    setShowSearchResults(false);
    setShowChangeLocationModal(false);
  }

  function formatDistance(m: number): string {
    if (m < 1000) {
      return `${Math.round(m)} m away`;
    }
    return `${(m / 1000).toFixed(1)} km away`;
  }

  // Calculate Infographics Stats
  const joinedCount = shops.filter(
    (s) => s.hasJoinedPrintSafe !== false
  ).length;
  const unclaimedCount = shops.filter(
    (s) => s.hasJoinedPrintSafe === false
  ).length;

  const filteredShops = shops.filter((s) => {
    if (partnerFilter === "joined") return s.hasJoinedPrintSafe !== false;
    if (partnerFilter === "unclaimed") return s.hasJoinedPrintSafe === false;
    return true;
  });

  // Pre-mount / SSR fallback: identical loading shell to ensure zero hydration mismatch
  if (!isMounted) {
    return (
      <CustomerShell userAlias={userAlias} fullBleed={true}>
        <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--bg)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      </CustomerShell>
    );
  }

  // MANDATORY LOCATION ENABLER: If location is not enabled, block with full-viewport request
  if (!userLocation) {
    return (
      <CustomerShell userAlias={userAlias} fullBleed={true}>
        <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[var(--bg)] select-none">
          <Card3D className="max-w-md w-full p-6 sm:p-8 space-y-6 text-center border-2 border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-[var(--accent-fill)]/20 border-2 border-[var(--accent)] flex items-center justify-center text-[var(--accent)] mx-auto extrude-md">
              <Navigation className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-[var(--text)] tracking-tight">
                Location Required
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                PrintSafe requires your real-time GPS location to display live
                verified Xerox counters, estimate walking distances, and enable
                zero-trust printing.
              </p>
            </div>

            {locationError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold leading-relaxed text-left flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{locationError}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button3D
                variant="primary"
                size="md"
                onClick={handleRequestLocation}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 font-bold py-3 text-sm"
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Compass className="w-4 h-4" />
                )}
                {isLocating
                  ? "Detecting Coordinates..."
                  : "Share My GPS Location"}
              </Button3D>

              {/* Area / Landmark Search Fallback (NO Bangalore Central Default!) */}
              <div className="pt-3 border-t border-[var(--border)] text-left">
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1.5">
                  Or search your neighborhood or street:
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    placeholder="e.g. Indiranagar, MG Road, Campus..."
                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-3 w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                  )}
                </div>

                {showSearchResults && searchResults.length > 0 && (
                  <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map((place, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectPlace(place)}
                        className="w-full p-2 text-left text-xs border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors flex items-center gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        <span className="truncate font-semibold text-[var(--text)]">
                          {place.displayName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card3D>
        </div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell userAlias={userAlias} fullBleed={true}>
      <div className="relative w-full h-full overflow-hidden flex flex-col bg-[var(--bg)] select-none">
        {/* Sleek Minimal Floating Control Bar */}
        <div className="z-30 w-full px-3 py-2 sm:px-4 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-xs">
          {/* Left: Current Location & Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-xl">
            <button
              onClick={() => setShowChangeLocationModal(true)}
              className="h-9 px-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text)] flex items-center gap-1.5 shrink-0 transition-colors"
              title="Change Search Location"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">
                {userLocation.name || "My Location"}
              </span>
            </button>

            <div className="relative flex-1">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchResults(true);
                  }}
                  placeholder="Search landmark, area, or college..."
                  className="w-full h-9 pl-8 pr-7 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-2.5 w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                ) : searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setShowSearchResults(false);
                    }}
                    className="absolute right-2 text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>

              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-11 z-[60] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
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
          </div>

          {/* Right: Controls & Far-Right Tree Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Open Now Toggle Pill */}
            <button
              onClick={() => setIncludeClosed(!includeClosed)}
              className={`h-9 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                !includeClosed
                  ? "bg-[var(--accent-fill)]/20 border-[var(--accent)] text-[var(--text)]"
                  : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  !includeClosed ? "bg-[var(--accent-fill)]" : "bg-gray-400"
                }`}
              />
              <span>{!includeClosed ? "Open Now" : "All Counters"}</span>
            </button>

            {/* Radius Selector Chip */}
            <div className="relative">
              <select
                value={radiusM}
                onChange={(e) => setRadiusM(parseInt(e.target.value, 10))}
                className="h-9 px-2.5 pr-6 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs font-bold text-[var(--text)] focus:outline-none cursor-pointer appearance-none"
              >
                <option value={1000}>1 km</option>
                <option value={3000}>3 km</option>
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)] absolute right-2 top-3 pointer-events-none" />
            </div>

            {/* Locate Me (GPS) Button */}
            <button
              onClick={handleRequestLocation}
              disabled={isLocating}
              className="h-9 w-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all shrink-0"
              title="Re-center on My GPS Coordinates"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
              ) : (
                <Compass className="w-4 h-4" />
              )}
            </button>

            {/* Desktop Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex h-9 w-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] items-center justify-center text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all shrink-0"
              title={isSidebarOpen ? "Hide Counter List" : "Show Counter List"}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            {/* Paper Footprint Button (Pinned to Far Right) */}
            <Button3D
              variant="outline"
              size="sm"
              onClick={() => setShowTreeModal(true)}
              className="h-9 flex items-center gap-1.5 text-xs font-bold shrink-0 px-2.5 ml-1"
              title="View Paper Footprint Tree"
            >
              <TreePine className="w-4 h-4 text-[var(--accent)]" />
              <span className="font-mono text-[11px]">
                {sheetsPrintedTotal}
              </span>
            </Button3D>
          </div>
        </div>

        {/* Full Viewport Content Area */}
        <div className="relative flex-1 w-full h-full overflow-hidden flex">
          {/* Desktop Left Side Panel (Infographics + Counter List) */}
          <div
            className={`hidden lg:flex flex-col border-r border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md overflow-hidden shrink-0 z-20 transition-all duration-300 ${
              isSidebarOpen ? "w-[390px]" : "w-0 border-r-0"
            }`}
          >
            {/* Infographics Overview Bar */}
            <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-2)]/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text)]">
                  Storefront Status Overview
                </span>
                <button
                  onClick={refreshShops}
                  className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded-lg"
                  title="Refresh Storefronts"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${isLoadingShops ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {/* Infographic Visual Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  onClick={() => setPartnerFilter("joined")}
                  className={`p-2 rounded-xl border cursor-pointer transition-all ${
                    partnerFilter === "joined"
                      ? "border-[var(--accent)] bg-[var(--accent-fill)]/15 shadow-xs"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--accent)]">
                      Joined PrintSafe
                    </span>
                    <span className="font-mono font-black text-xs text-[var(--accent)]">
                      {joinedCount}
                    </span>
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    4-Digit Code &bull; Cloud Print
                  </p>
                </div>

                <div
                  onClick={() => setPartnerFilter("unclaimed")}
                  className={`p-2 rounded-xl border cursor-pointer transition-all ${
                    partnerFilter === "unclaimed"
                      ? "border-amber-500 bg-amber-500/15 shadow-xs"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-amber-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-500">
                      Not Onboarded
                    </span>
                    <span className="font-mono font-black text-xs text-amber-500">
                      {unclaimedCount}
                    </span>
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    Offline Walk-in Counter
                  </p>
                </div>
              </div>

              {/* Quick Filter Pill Switcher */}
              <div className="flex items-center gap-1 pt-0.5">
                <button
                  onClick={() => setPartnerFilter("all")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    partnerFilter === "all"
                      ? "bg-[var(--text)] text-[var(--surface)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  All ({shops.length})
                </button>
                <button
                  onClick={() => setPartnerFilter("joined")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    partnerFilter === "joined"
                      ? "bg-[var(--accent)] text-zinc-950 font-black"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  ✓ Joined ({joinedCount})
                </button>
                <button
                  onClick={() => setPartnerFilter("unclaimed")}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    partnerFilter === "unclaimed"
                      ? "bg-amber-500 text-zinc-950 font-black"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  Unclaimed ({unclaimedCount})
                </button>
              </div>
            </div>

            {/* Storefronts List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
              {isLoadingShops && shops.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)] mx-auto" />
                  <p className="text-xs text-[var(--text-muted)]">
                    Scanning nearby photocopy counters...
                  </p>
                </div>
              ) : filteredShops.length === 0 ? (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="w-7 h-7 text-[var(--warm)] mx-auto opacity-70" />
                  <h3 className="text-xs font-bold text-[var(--text)]">
                    No Matching Counters
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    No counters found for this filter within{" "}
                    {radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`}.
                  </p>
                  <Button3D
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setRadiusM(10000);
                      setPartnerFilter("all");
                    }}
                    className="w-full text-xs font-bold"
                  >
                    Expand Search to 10 km
                  </Button3D>
                </div>
              ) : (
                filteredShops.map((shop) => (
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

            {/* Selected Shop Action Card at Bottom of Sidebar */}
            {selectedShop && (
              <div className="p-3.5 border-t border-[var(--border)] bg-[var(--surface-2)] space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start justify-between">
                  <div className="truncate">
                    <h3 className="text-xs font-extrabold text-[var(--text)] truncate">
                      {selectedShop.name}
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {selectedShop.locality || selectedShop.city} &bull;{" "}
                      {formatDistance(selectedShop.distanceMeters)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedShop(null)}
                    className="text-[var(--text-muted)] hover:text-[var(--text)] p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedShop.hasJoinedPrintSafe !== false ? (
                    <Badge variant="live" size="sm">
                      ✓ PrintSafe Partner
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Walk-in Counter (Not on PrintSafe)
                    </Badge>
                  )}
                  {selectedShop.isLive && (
                    <Badge variant="live" size="sm">
                      Open Now
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[var(--surface)] p-2 rounded-xl border border-[var(--border)]">
                  <div>
                    <span className="text-[var(--text-muted)] block text-[9px] uppercase tracking-wider font-semibold">
                      B&amp;W Rate
                    </span>
                    <span className="font-extrabold font-mono text-[var(--text)]">
                      ₹{(selectedShop.priceBwPaise / 100).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[9px] uppercase tracking-wider font-semibold">
                      Colour Rate
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
                      className="w-full flex items-center justify-center gap-1 text-xs font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Directions
                    </Button3D>
                  </a>

                  {selectedShop.hasJoinedPrintSafe !== false && (
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
                        Print
                      </Button3D>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Direct Leaflet Map Canvas */}
          <div className="relative flex-1 w-full h-full overflow-hidden">
            <ShopMap
              userLocation={userLocation}
              shops={filteredShops}
              selectedShopId={selectedShop?.id || null}
              onSelectShop={(shop) => {
                setSelectedShop(shop);
                setIsSheetExpanded(true);
              }}
              className="w-full h-full"
            />

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
                      : `${filteredShops.length} Counters Nearby (${joinedCount} on PrintSafe)`}
                  </span>
                  {isSheetExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  )}
                </div>
              </button>

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
                      {selectedShop.hasJoinedPrintSafe !== false ? (
                        <Badge variant="live" size="sm">
                          ✓ Joined PrintSafe
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Not on PrintSafe yet
                        </Badge>
                      )}
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
                          className="w-full text-xs font-semibold"
                        >
                          Directions
                        </Button3D>
                      </a>
                      {selectedShop.hasJoinedPrintSafe !== false && (
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
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredShops.slice(0, 6).map((shop) => (
                      <div
                        key={shop.id}
                        onClick={() => setSelectedShop(shop)}
                        className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold text-[var(--text)] truncate">
                            {shop.name}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {formatDistance(shop.distanceMeters)} &bull;{" "}
                            {shop.hasJoinedPrintSafe !== false
                              ? "✓ PrintSafe Partner"
                              : "Walk-in Counter"}
                          </p>
                        </div>
                        {shop.hasJoinedPrintSafe !== false ? (
                          <Badge variant="live" size="sm">
                            PrintSafe
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Unclaimed
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Change Location Modal */}
        <Modal
          isOpen={showChangeLocationModal}
          onClose={() => setShowChangeLocationModal(false)}
          title="Update Search Location"
        >
          <div className="space-y-4 text-xs p-1">
            <p className="text-[var(--text-muted)] leading-relaxed">
              Scan xerox counters around your GPS location or search for another
              neighborhood.
            </p>

            <Button3D
              variant="primary"
              size="md"
              onClick={handleRequestLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 font-bold py-2.5"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Compass className="w-4 h-4" />
              )}
              {isLocating
                ? "Updating GPS..."
                : "Re-detect Current GPS Position"}
            </Button3D>
          </div>
        </Modal>

        {/* Paper Footprint Tree Modal */}
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
  const isPartner = shop.hasJoinedPrintSafe !== false;

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
        {isPartner ? (
          <Badge variant="live" size="sm">
            ✓ PrintSafe
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm">
            Not Joined
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)] text-[10px]">
        <span className="text-[var(--text-muted)] font-mono">
          {formatDistance(shop.distanceMeters)}
        </span>
        <div className="flex items-center gap-2">
          {isPartner ? (
            <span className="font-mono font-bold text-[var(--accent)]">
              ₹{(shop.priceBwPaise / 100).toFixed(2)}/pg
            </span>
          ) : (
            <span className="text-[10px] text-[var(--text-muted)] font-medium">
              Walk-in Counter
            </span>
          )}
        </div>
      </div>
    </Card3D>
  );
}
