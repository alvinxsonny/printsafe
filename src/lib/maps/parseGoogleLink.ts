export interface ParsedGoogleLink {
  isValid: boolean;
  isShortLink: boolean;
  rawUrl: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  googleFtid?: string;
  cid?: string;
  error?: string;
}

/**
 * Pure function parsing various shapes of Google Maps URLs.
 * Extracts shop name, latitude, longitude, and feature ID (google_ftid).
 *
 * Rules:
 * - Prefers place pin (!3d<lat>!4d<lng>) over viewport centre (@lat,lng).
 * - Decodes URL encoded names and converts '+' to spaces.
 * - Extracts google_ftid (0x...:0x...).
 * - Detects short links (maps.app.goo.gl, goo.gl/maps) requiring resolution.
 */
export function parseGoogleLink(rawInput: string): ParsedGoogleLink {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      isValid: false,
      isShortLink: false,
      rawUrl: trimmed,
      error: "Empty URL provided",
    };
  }

  // Ensure protocol
  let urlString = trimmed;
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    return {
      isValid: false,
      isShortLink: false,
      rawUrl: trimmed,
      error: "Invalid URL format",
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // 1. Detect short links
  const isShortHost =
    hostname === "maps.app.goo.gl" ||
    hostname === "goo.gl" ||
    (hostname.endsWith(".goo.gl") && pathname.startsWith("/maps"));

  if (isShortHost) {
    return {
      isValid: true,
      isShortLink: true,
      rawUrl: trimmed,
    };
  }

  // Verify host belongs to Google Maps
  const isGoogleHost =
    hostname === "google.com" ||
    hostname.endsWith(".google.com") ||
    hostname === "maps.google.com" ||
    hostname.includes("google.");

  if (!isGoogleHost) {
    return {
      isValid: false,
      isShortLink: false,
      rawUrl: trimmed,
      error: "Not a valid Google Maps URL",
    };
  }

  let name: string | undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;
  let googleFtid: string | undefined;
  let cid: string | undefined;

  // 2. Extract Google Feature ID (0x...:0x...)
  // Look for 0x[hex]:0x[hex] pattern across pathname, search, and hash
  const fullText = decodeURIComponent(urlString);
  const ftidMatch = fullText.match(
    /(?:1s|ftid=)?(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/
  );
  if (ftidMatch && ftidMatch[1]) {
    googleFtid = ftidMatch[1];
  }

  // 3. Extract CID parameter if present
  const cidParam = searchParams.get("cid");
  if (cidParam) {
    cid = cidParam;
  } else {
    const cidInText = fullText.match(/[?&]cid=(\d+)/);
    if (cidInText && cidInText[1]) {
      cid = cidInText[1];
    }
  }

  // 4. Extract Name
  // Shape A: /maps/place/<NAME>/...
  const placeMatch = pathname.match(/\/place\/([^/@?]+)/);
  if (placeMatch && placeMatch[1]) {
    const rawName = placeMatch[1].replace(/\+/g, " ");
    try {
      name = decodeURIComponent(rawName);
    } catch {
      name = rawName;
    }
  }

  // Shape B: /maps/search/<NAME>/...
  if (!name) {
    const searchMatch = pathname.match(/\/search\/([^/@?]+)/);
    if (searchMatch && searchMatch[1]) {
      const rawName = searchMatch[1].replace(/\+/g, " ");
      try {
        name = decodeURIComponent(rawName);
      } catch {
        name = rawName;
      }
    }
  }

  // Shape C: q= parameter (e.g. q=Shop+Name or q=Shop+Name@lat,lng or q=Shop+Name&ll=lat,lng)
  if (!name && searchParams.has("q")) {
    const qVal = searchParams.get("q")!;
    if (qVal.includes("@")) {
      const beforeAt = qVal.split("@")[0].replace(/\+/g, " ").trim();
      if (beforeAt) name = beforeAt;
    } else if (!/^-?\d+(?:\.\d+)?[,\s]+-?\d+(?:\.\d+)?$/.test(qVal.trim())) {
      // It's a text search or name
      name = qVal.replace(/\+/g, " ").trim();
    }
  }

  // Shape D: query= parameter
  if (!name && searchParams.has("query")) {
    name = searchParams.get("query")!.replace(/\+/g, " ").trim();
  }

  // 5. Extract Coordinates:
  // Priority 1: Place Pin in data parameter: !3d<lat>!4d<lng> or !4d<lng>!3d<lat>
  const dataParam = searchParams.get("data") || fullText;
  const pin3d4d = dataParam.match(
    /!3d(-?\d+(?:\.\d+)?)(?:[^!]*?)!4d(-?\d+(?:\.\d+)?)/
  );
  if (pin3d4d && pin3d4d[1] && pin3d4d[2]) {
    const lat = parseFloat(pin3d4d[1]);
    const lng = parseFloat(pin3d4d[2]);
    if (isValidCoord(lat, lng)) {
      latitude = lat;
      longitude = lng;
    }
  }

  // If 4d comes before 3d: !4d<lng>!3d<lat>
  if (latitude === undefined || longitude === undefined) {
    const pin4d3d = dataParam.match(
      /!4d(-?\d+(?:\.\d+)?)(?:[^!]*?)!3d(-?\d+(?:\.\d+)?)/
    );
    if (pin4d3d && pin4d3d[1] && pin4d3d[2]) {
      const lng = parseFloat(pin4d3d[1]);
      const lat = parseFloat(pin4d3d[2]);
      if (isValidCoord(lat, lng)) {
        latitude = lat;
        longitude = lng;
      }
    }
  }

  // Priority 2: ll=lat,lng query parameter
  if (latitude === undefined || longitude === undefined) {
    const ll = searchParams.get("ll");
    if (ll) {
      const [latStr, lngStr] = ll.split(",");
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isValidCoord(lat, lng)) {
        latitude = lat;
        longitude = lng;
      }
    }
  }

  // Priority 3: q=lat,lng query parameter or q=name@lat,lng
  if (latitude === undefined || longitude === undefined) {
    const qVal = searchParams.get("q");
    if (qVal) {
      const coordMatch = qVal.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
      if (coordMatch && coordMatch[1] && coordMatch[2]) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        if (isValidCoord(lat, lng)) {
          latitude = lat;
          longitude = lng;
        }
      }
    }
  }

  // Priority 4: Viewport centre @lat,lng in path or URL
  if (latitude === undefined || longitude === undefined) {
    const atMatch = fullText.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch && atMatch[1] && atMatch[2]) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (isValidCoord(lat, lng)) {
        latitude = lat;
        longitude = lng;
      }
    }
  }

  const isValid = Boolean(
    name ||
    (latitude !== undefined && longitude !== undefined) ||
    cid ||
    googleFtid
  );

  return {
    isValid,
    isShortLink: false,
    rawUrl: trimmed,
    name,
    latitude,
    longitude,
    googleFtid,
    cid,
  };
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
