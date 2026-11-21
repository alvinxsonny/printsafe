import { env } from "@/lib/env";
import { throttleNominatim } from "./throttle";

export interface PlaceSearchResult {
  displayName: string;
  lat: number;
  lng: number;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

const searchCache = new Map<string, PlaceSearchResult[]>();

/**
 * Searches places via Nominatim geocoder proxy.
 * Respects Nominatim rate limits (1 req/sec) and custom User-Agent.
 */
export async function searchPlaces(
  query: string,
  limit: number = 5
): Promise<PlaceSearchResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (cleanQuery.length < 2) {
    return [];
  }

  const cached = searchCache.get(cleanQuery);
  if (cached) {
    return cached;
  }

  await throttleNominatim();

  const url = new URL("/search", env.NOMINATIM_BASE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", cleanQuery);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "in"); // Priority India

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": env.GEO_USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(
      `Nominatim search request failed with status ${response.status}`
    );
  }

  interface NominatimSearchItem {
    display_name: string;
    lat: string;
    lon: string;
    address?: {
      suburb?: string;
      neighbourhood?: string;
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      postcode?: string;
    };
  }

  const rawResults: NominatimSearchItem[] = await response.json();

  const mapped: PlaceSearchResult[] = rawResults.map((item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const addr = item.address || {};
    const locality =
      addr.suburb || addr.neighbourhood || addr.town || addr.village;
    const city = addr.city || addr.town || addr.village || "";
    const state = addr.state || "";
    const pincode = addr.postcode || "";

    return {
      displayName: item.display_name,
      lat,
      lng,
      locality,
      city,
      state,
      pincode,
    };
  });

  // Cache results (cap cache size to prevent memory leaks)
  if (searchCache.size > 500) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(cleanQuery, mapped);

  return mapped;
}
