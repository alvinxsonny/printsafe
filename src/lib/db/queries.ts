import { sql, inArray, and } from "drizzle-orm";
import { db } from "./client";
import { shopHours, printJobs } from "./schema";
import type { shops, shopSubscriptions } from "./schema";

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

export interface NearbyShopDetail {
  id: string;
  name: string;
  addressLine: string;
  locality: string | null;
  city: string;
  priceBwPaise: number;
  priceColorPaise: number;
  services: {
    bw: boolean;
    color: boolean;
    a3: boolean;
    duplex: boolean;
  };
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number;
  isLive: boolean;
  capacityState: "normal" | "busy" | "at_capacity" | "walk_in_only";
  hours: { weekday: number; opens: string; closes: string }[];
  phone: string | null;
  hasJoinedPrintSafe?: boolean;
}

/**
 * Queries nearby approved shops within radiusM meters, computes their real-time live status
 * and capacity state, and filters out offline shops unless includeClosed is true.
 * Privacy rule: Never exposes owner details or private merchant phone numbers.
 */
export async function findNearbyShops(params: {
  lat: number;
  lng: number;
  radiusM?: number;
  includeClosed?: boolean;
}): Promise<NearbyShopDetail[]> {
  const { lat, lng, radiusM = 5000, includeClosed = false } = params;

  const query = sql<{
    id: string;
    name: string;
    addressLine: string;
    locality: string | null;
    city: string;
    priceBwPaise: number;
    priceColorPaise: number;
    services: { bw: boolean; color: boolean; a3: boolean; duplex: boolean };
    latitude: number | null;
    longitude: number | null;
    status: string;
    manualLive: boolean;
    scheduleEnabled: boolean;
    contactPhone: string | null;
    showPhone: boolean;
    subscriptionStatus: string;
    subscriptionPeriodEnd: Date | string;
    distanceMeters: number;
  }>`
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
      s.status,
      s.manual_live as "manualLive",
      s.schedule_enabled as "scheduleEnabled",
      s.contact_phone as "contactPhone",
      s.show_phone as "showPhone",
      sub.status as "subscriptionStatus",
      sub.period_end as "subscriptionPeriodEnd",
      ROUND(ST_Distance(
        s.location::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      )) as "distanceMeters"
    FROM shops s
    JOIN shop_subscriptions sub ON sub.shop_id = s.id
    WHERE s.status = 'approved'
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
  const rows = results.rows as unknown as {
    id: string;
    name: string;
    addressLine: string;
    locality: string | null;
    city: string;
    priceBwPaise: number;
    priceColorPaise: number;
    services: { bw: boolean; color: boolean; a3: boolean; duplex: boolean };
    latitude: number | null;
    longitude: number | null;
    status: string;
    manualLive: boolean;
    scheduleEnabled: boolean;
    contactPhone: string | null;
    showPhone: boolean;
    subscriptionStatus: string;
    subscriptionPeriodEnd: Date | string;
    distanceMeters: number;
  }[];

  if (rows.length === 0) return [];

  const shopIds = rows.map((r) => r.id);

  // Fetch shop hours
  const hoursRows = await db
    .select({
      shopId: shopHours.shopId,
      weekday: shopHours.weekday,
      opens: shopHours.opens,
      closes: shopHours.closes,
    })
    .from(shopHours)
    .where(inArray(shopHours.shopId, shopIds));

  // Fetch active jobs per shop
  const activeJobs = await db
    .select({
      shopId: printJobs.shopId,
      count: sql<number>`count(*)`,
    })
    .from(printJobs)
    .where(
      and(
        inArray(printJobs.shopId, shopIds),
        inArray(printJobs.status, ["requested", "accepted", "unlocked"])
      )
    )
    .groupBy(printJobs.shopId);

  const activeJobsMap = new Map<string, number>();
  for (const aj of activeJobs) {
    activeJobsMap.set(aj.shopId, Number(aj.count));
  }

  const hoursMap = new Map<
    string,
    { weekday: number; opens: string; closes: string }[]
  >();
  for (const h of hoursRows) {
    const list = hoursMap.get(h.shopId) || [];
    list.push({ weekday: h.weekday, opens: h.opens, closes: h.closes });
    hoursMap.set(h.shopId, list);
  }

  const nearbyShops: NearbyShopDetail[] = [];
  const now = new Date();

  for (const row of rows) {
    const shopHoursList = hoursMap.get(row.id) || [];
    const isLive = isShopLive(
      {
        status: row.status,
        manualLive: row.manualLive,
        scheduleEnabled: row.scheduleEnabled,
      },
      shopHoursList,
      {
        status: row.subscriptionStatus,
        periodEnd: row.subscriptionPeriodEnd,
      },
      now
    );

    if (!includeClosed && !isLive) {
      continue;
    }

    const jobCount = activeJobsMap.get(row.id) || 0;
    let capacityState: "normal" | "busy" | "at_capacity" = "normal";
    if (jobCount >= 10) {
      capacityState = "at_capacity";
    } else if (jobCount >= 5) {
      capacityState = "busy";
    }

    nearbyShops.push({
      id: row.id,
      name: row.name,
      addressLine: row.addressLine,
      locality: row.locality,
      city: row.city,
      priceBwPaise: Number(row.priceBwPaise),
      priceColorPaise: Number(row.priceColorPaise),
      services: row.services || {
        bw: true,
        color: true,
        a3: false,
        duplex: true,
      },
      latitude: row.latitude,
      longitude: row.longitude,
      distanceMeters: Number(row.distanceMeters),
      isLive,
      capacityState,
      hours: shopHoursList,
      phone: row.showPhone ? row.contactPhone : null,
      hasJoinedPrintSafe: true,
    });
  }

  return nearbyShops;
}
