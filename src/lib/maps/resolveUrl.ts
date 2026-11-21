import dns from "node:dns/promises";

const ALLOWED_EXACT_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "google.com",
  "www.google.com",
  "maps.google.com",
]);

/**
 * Checks whether the hostname is an allowed Google Maps domain.
 * Disallows arbitrary external destinations.
 */
export function isAllowedGoogleHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (ALLOWED_EXACT_HOSTS.has(lower)) {
    return true;
  }

  // Allow standard regional Google domains (e.g. google.co.in, maps.google.co.in, google.com.au)
  return /^(?:(?:maps|www)\.)?google\.(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/i.test(
    lower
  );
}

/**
 * Checks if an IP address belongs to private, loopback, link-local, or metadata ranges.
 * Implements strict SSRF protection (Section 10 of plan.md).
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 Loopback, Local identification, Link-local (Cloud metadata)
  if (
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("169.254.") ||
    ip.startsWith("0.")
  ) {
    return true;
  }

  const parts = ip.split(".").map(Number);
  if (
    parts.length === 4 &&
    parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)
  ) {
    // 172.16.0.0 - 172.31.255.255
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }
    // 192.168.0.0 - 192.168.255.255
    if (parts[0] === 192 && parts[1] === 168) {
      return true;
    }
    // 100.64.0.0 - 100.127.255.255 (Carrier-Grade NAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) {
      return true;
    }
    // 224.0.0.0 - 239.255.255.255 (Multicast) or 240.0.0.0/4 (Reserved)
    if (parts[0] >= 224) {
      return true;
    }
  }

  // IPv6
  const lowerIp = ip.toLowerCase();
  if (
    lowerIp === "::1" ||
    lowerIp === "::" ||
    lowerIp.startsWith("fe80:") || // Link-local
    lowerIp.startsWith("fc") || // ULA fc00::/7 (covers fc.. and fd..)
    lowerIp.startsWith("fd")
  ) {
    return true;
  }

  return false;
}

export interface ResolveResult {
  finalUrl: string;
  redirectHops: number;
}

/**
 * Manually resolves Google Maps short-links with SSRF protection:
 * - Domain allowlist
 * - DNS lookup verification against private/loopback IPs
 * - Follows at most 5 redirects manually
 * - 5-second timeout per hop
 * - GET only, no cookies
 */
export async function resolveGoogleShortLink(
  initialUrl: string,
  maxHops: number = 5
): Promise<ResolveResult> {
  let currentUrl = initialUrl.trim();
  if (!/^https?:\/\//i.test(currentUrl)) {
    currentUrl = `https://${currentUrl}`;
  }

  let hops = 0;

  while (hops < maxHops) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new Error(`Invalid URL during redirect chain: ${currentUrl}`);
    }

    if (!isAllowedGoogleHost(parsed.hostname)) {
      throw new Error(
        `Disallowed host during redirect: ${parsed.hostname}. Only Google Maps domains are permitted.`
      );
    }

    // SSRF Check: resolve IP before connecting
    try {
      const records = await dns.lookup(parsed.hostname, { all: true });
      for (const record of records) {
        if (isPrivateOrReservedIp(record.address)) {
          throw new Error(
            `SSRF blocked: ${parsed.hostname} resolved to reserved address ${record.address}`
          );
        }
      }
    } catch (dnsErr) {
      const msg = dnsErr instanceof Error ? dnsErr.message : "DNS error";
      if (msg.includes("SSRF blocked")) throw dnsErr;
      // If DNS lookup fails, abort
      throw new Error(`DNS resolution failed for ${parsed.hostname}: ${msg}`);
    }

    // Perform manual GET request with 5-second timeout and no cookies
    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(5000),
    });

    const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
    const location = response.headers.get("location");

    if (isRedirect && location) {
      hops++;
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = nextUrl;
      continue;
    }

    // If not redirecting, we reached the final destination
    break;
  }

  return {
    finalUrl: currentUrl,
    redirectHops: hops,
  };
}
