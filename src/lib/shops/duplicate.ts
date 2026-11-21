import { eq, and, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { shops } from "@/lib/db/schema/shops";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateReason?: string;
  proximityWarning?: boolean;
  nearbyShopName?: string;
  nearbyDistanceM?: number;
}

/**
 * Checks for duplicate shops:
 * 1. Exact match on google_ftid blocks registration.
 * 2. Another shop within 30 metres raises a proximity warning.
 */
export async function checkShopDuplicates(
  currentShopId: string | null,
  googleFtid: string | null | undefined,
  latitude: number | null | undefined,
  longitude: number | null | undefined
): Promise<DuplicateCheckResult> {
  // 1. Exact google_ftid check
  if (googleFtid && googleFtid.trim()) {
    const trimmedFtid = googleFtid.trim();
    const existing = await db
      .select({ id: shops.id, name: shops.name })
      .from(shops)
      .where(
        currentShopId
          ? and(eq(shops.googleFtid, trimmedFtid), ne(shops.id, currentShopId))
          : eq(shops.googleFtid, trimmedFtid)
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        isDuplicate: true,
        duplicateReason: `This Google Maps place is already registered under "${existing[0].name}".`,
      };
    }
  }

  // 2. Proximity check (< 30 metres)
  if (
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  ) {
    try {
      const result = await db.execute<{
        id: string;
        name: string;
        distance_m: number;
      }>(sql`
        SELECT id, name,
          ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) as distance_m
        FROM shops
        WHERE (${currentShopId ? sql`id != ${currentShopId}` : sql`TRUE`})
          AND location IS NOT NULL
          AND ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            30
          )
        ORDER BY distance_m ASC
        LIMIT 1;
      `);

      const rows = result.rows;
      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          isDuplicate: false,
          proximityWarning: true,
          nearbyShopName: row.name,
          nearbyDistanceM: Math.round(Number(row.distance_m)),
        };
      }
    } catch (err) {
      // In testing environments or mock DBs where PostGIS isn't installed, fail gracefully
      console.warn("Proximity check query skipped or failed:", err);
    }
  }

  return {
    isDuplicate: false,
  };
}
