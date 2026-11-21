import { sql } from "drizzle-orm";
import { db } from "./client";
import type { shops, shopHours, shopSubscriptions } from "./schema";

export type Shop = typeof shops.$inferSelect;
export type ShopHours = typeof shopHours.$inferSelect;
export type ShopSubscription = typeof shopSubscriptions.$inferSelect;

/**
 * Computes whether a shop is currently live.
 * Rules (Section 6 of plan.md):
 * A shop is live if:
 * 1. status = approved
 * 2. subscription status is trial, active, or grace (and not past periodEnd)
 * 3. manual_live = true
 * 4. schedule_enabled = false OR now is inside shop_hours
 */
export function isShopLive(
  shop: {
    status: string;
    manualLive: boolean;
    scheduleEnabled: boolean;
  },
  hours: { weekday: number; opens: string; closes: string }[] = [],
  subscription: {
    status: string;
    periodEnd: Date | string;
  } | null = null,
  now: Date = new Date(),
  timeZone: string = "Asia/Kolkata"
): boolean {
  // 1. Status must be approved
  if (shop.status !== "approved") {
    return false;
  }

  // 2. Subscription must be active, trial, or grace and not expired
  if (!subscription) {
    return false;
  }

  const validStatuses = ["trial", "active", "grace"];
  if (!validStatuses.includes(subscription.status)) {
    return false;
  }

  const periodEndDate = new Date(subscription.periodEnd);
  if (now.getTime() > periodEndDate.getTime()) {
    return false;
  }

  // 3. Manual Live switch must be ON
  if (!shop.manualLive) {
    return false;
  }

  // 4. Schedule check
  if (!shop.scheduleEnabled) {
    return true;
  }

  // Check if current time in given timezone falls within today's shop hours
  return isTimeInsideHours(hours, now, timeZone);
}

/**
 * Helper to check if current time falls within registered shop hours
 */
export function isTimeInsideHours(
  hours: { weekday: number; opens: string; closes: string }[],
  now: Date = new Date(),
  timeZone: string = "Asia/Kolkata"
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    let weekdayStr = "";
    let hourStr = "00";
    let minuteStr = "00";

    for (const part of parts) {
      if (part.type === "weekday") weekdayStr = part.value;
      if (part.type === "hour") hourStr = part.value;
      if (part.type === "minute") minuteStr = part.value;
    }

    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const currentWeekday = weekdayMap[weekdayStr] ?? now.getUTCDay();
    const currentTime = `${hourStr.padStart(2, "0")}:${minuteStr.padStart(2, "0")}`;

    const todayHours = hours.find((h) => h.weekday === currentWeekday);
    if (!todayHours) {
      return false;
    }

    return currentTime >= todayHours.opens && currentTime < todayHours.closes;
  } catch {
    // Fallback using UTC if timezone formatting fails
    const currentWeekday = now.getUTCDay();
    const currentHours = String(now.getUTCHours()).padStart(2, "0");
    const currentMinutes = String(now.getUTCMinutes()).padStart(2, "0");
    const currentTime = `${currentHours}:${currentMinutes}`;

    const todayHours = hours.find((h) => h.weekday === currentWeekday);
    if (!todayHours) {
      return false;
    }

    return currentTime >= todayHours.opens && currentTime < todayHours.closes;
  }
}

export interface NearbyShopResult {
  id: string;
  name: string;
  addressLine: string;
  locality: string | null;
  city: string;
  priceBwPaise: number;
  priceColorPaise: number;
  services: unknown;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number;
}

/**
 * Finds live nearby approved shops within radiusM meters using PostGIS ST_DWithin & ST_Distance
 */
export async function findLiveShopsNear(
  lat: number,
  lng: number,
  radiusM: number = 5000
): Promise<NearbyShopResult[]> {
  const query = sql<NearbyShopResult>`
    SELECT 
      s.id,
      s.name,
      s.address_line as "addressLine",
      s.locality,
      s.city,
      s.price_bw_paise as "priceBwPaise",
      s.price_color_paise as "priceColorPaise",
      s.services,
      s.latitude,
      s.longitude,
      ROUND(ST_Distance(
        s.location::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      )) as "distanceMeters"
    FROM shops s
    JOIN shop_subscriptions sub ON sub.shop_id = s.id
    WHERE s.status = 'approved'
      AND s.manual_live = true
      AND sub.status IN ('trial', 'active', 'grace')
      AND sub.period_end > NOW()
      AND ST_DWithin(
        s.location::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusM}
      )
    ORDER BY "distanceMeters" ASC
  `;

  const results = await db.execute(query);
  return results.rows as unknown as NearbyShopResult[];
}
