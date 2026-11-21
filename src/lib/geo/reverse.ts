import { env } from "@/lib/env";
import type { ShopExtractionItem } from "@/lib/db/schema/shops";

interface ReverseGeocodeResult {
  addressLine: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  displayName: string;
  osmEnrichment?: {
    phone?: string;
    openingHours?: string;
    website?: string;
  };
  extraction: Record<string, ShopExtractionItem>;
}

// In-memory cache for coordinates (~1m precision with 5 decimals)
const geoCache = new Map<string, ReverseGeocodeResult>();

// Strict throttle to obey Nominatim's 1 request per second usage policy
let lastNominatimRequestTime = 0;
let requestQueue = Promise.resolve();

async function throttleNominatim(): Promise<void> {
  const currentQueue = requestQueue;
  let release: () => void;
  requestQueue = new Promise((resolve) => {
    release = resolve;
  });

  await currentQueue;

  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  const waitMs = Math.max(0, 1100 - timeSinceLast);

  if (waitMs > 0) {
    await new Promise((res) => setTimeout(res, waitMs));
  }

  lastNominatimRequestTime = Date.now();
  release!();
}

/**
 * Reverse geocodes coordinates via Nominatim proxy and optionally enriches via Overpass.
 * Respects Nominatim rate limit (1 req/sec) and custom User-Agent.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = geoCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Throttle before calling Nominatim
  await throttleNominatim();

  const url = new URL("/reverse", env.NOMINATIM_BASE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lng.toString());
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": env.GEO_USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(
      `Nominatim geocoding failed with status ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  const address = data.address || {};

  // Construct readable address line
  const buildingNumber =
    address.house_number || address.building || address.house_name || "";
  const road =
    address.road ||
    address.pedestrian ||
    address.street ||
    address.footway ||
    "";
  const addressLine =
    [buildingNumber, road].filter(Boolean).join(", ") ||
    data.name ||
    (data.display_name
      ? data.display_name.split(",").slice(0, 2).join(", ")
      : "");

  const locality =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.quarter ||
    address.village ||
    address.subdistrict ||
    "";

  const city =
    address.city ||
    address.town ||
    address.municipality ||
    address.county ||
    address.state_district ||
    "";

  const state = address.state || "";
  const pincode = address.postcode || "";

  const extraction: Record<string, ShopExtractionItem> = {
    addressLine: {
      value: addressLine,
      source: "nominatim",
      confidence: addressLine ? "high" : "low",
    },
    locality: {
      value: locality,
      source: "nominatim",
      confidence: locality ? "high" : "low",
    },
    city: {
      value: city,
      source: "nominatim",
      confidence: city ? "high" : "low",
    },
    state: {
      value: state,
      source: "nominatim",
      confidence: state ? "high" : "low",
    },
    pincode: {
      value: pincode,
      source: "nominatim",
      confidence: pincode ? "high" : "low",
    },
  };

  // Optional Overpass enrichment (Task 4)
  let osmEnrichment: ReverseGeocodeResult["osmEnrichment"] | undefined;
  try {
    osmEnrichment = await queryOverpassEnrichment(lat, lng);
    if (osmEnrichment) {
      if (osmEnrichment.phone) {
        extraction.contactPhone = {
          value: osmEnrichment.phone,
          source: "osm",
          confidence: "low",
        };
      }
      if (osmEnrichment.openingHours) {
        extraction.openingHours = {
          value: osmEnrichment.openingHours,
          source: "osm",
          confidence: "low",
        };
      }
    }
  } catch {
    // Overpass is optional: fail gracefully and continue
  }

  const result: ReverseGeocodeResult = {
    addressLine,
    locality,
    city,
    state,
    pincode,
    displayName: data.display_name || "",
    osmEnrichment,
    extraction,
  };

  geoCache.set(cacheKey, result);
  return result;
}

/**
 * Searches OSM within ~50m for printing/copy shops to read phone, opening_hours, website.
 */
async function queryOverpassEnrichment(
  lat: number,
  lng: number
): Promise<
  { phone?: string; openingHours?: string; website?: string } | undefined
> {
  const overpassQuery = `
[out:json][timeout:4];
(
  node["shop"="copyshop"](around:50,${lat},${lng});
  node["craft"="printer"](around:50,${lat},${lng});
  node["amenity"="printing_service"](around:50,${lat},${lng});
  way["shop"="copyshop"](around:50,${lat},${lng});
);
out tags;
`.trim();

  const response = await fetch(env.OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": env.GEO_USER_AGENT,
    },
    body: `data=${encodeURIComponent(overpassQuery)}`,
    signal: AbortSignal.timeout(4000),
  });

  if (!response.ok) return undefined;

  const data = await response.json();
  if (!data.elements || data.elements.length === 0) return undefined;

  for (const element of data.elements) {
    const tags = element.tags || {};
    const phone = tags.phone || tags["contact:phone"] || tags["contact:mobile"];
    const openingHours = tags.opening_hours;
    const website = tags.website || tags["contact:website"];

    if (phone || openingHours || website) {
      return { phone, openingHours, website };
    }
  }

  return undefined;
}
