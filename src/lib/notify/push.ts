import crypto from "node:crypto";
import * as webpush from "web-push";
import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  pushSubscriptions,
  notifications,
  customerProfiles,
} from "@/lib/db/schema";
import { env } from "@/lib/env";

// Configure Web Push with VAPID details
webpush.setVapidDetails(
  env.VAPID_SUBJECT,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Rounds a coordinate to approximately a 500-meter grid bucket for privacy protection.
 * Storing rounded coordinates ensures customer exact home/work locations are never recorded.
 */
export function roundCoordinateToGrid(
  coord: number,
  gridStep: number = 0.005
): number {
  return Number((Math.round(coord / gridStep) * gridStep).toFixed(4));
}

/**
 * Calculates great-circle distance between two coordinate pairs using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Sends a web push notification to all registered browser devices for a specific user.
 * Automatically cleans up expired or invalidated push subscriptions (404/410).
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (subs.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    const pushPayloadString = JSON.stringify(payload);

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          pushPayloadString
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number }).statusCode;
        // Clean up dead subscriptions (404 Not Found or 410 Gone)
        if (statusCode === 404 || statusCode === 410) {
          try {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, sub.id));
          } catch (delErr) {
            console.warn("Failed to delete expired push subscription:", delErr);
          }
        }
      }
    }

    return { sent, failed };
  } catch (err) {
    console.warn("Error sending push notification:", err);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Notifies opted-in customers within range when a print shop goes live.
 * Applies rate limiting: maximum 3 live alerts per customer per 24 hours.
 */
export async function notifyShopLiveToNearbyCustomers(shop: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  locality?: string | null;
}): Promise<number> {
  const { id: shopId, name: shopName, latitude, longitude, locality } = shop;
  if (!latitude || !longitude) return 0;

  try {
    // 1. Fetch all customer profiles with nearby alerts enabled
    const profiles = await db
      .select({
        userId: customerProfiles.userId,
        notifyArea: customerProfiles.notifyArea,
      })
      .from(customerProfiles)
      .where(eq(customerProfiles.notifyEnabled, true));

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let notifiedCount = 0;

    for (const profile of profiles) {
      if (
        !profile.notifyArea ||
        !profile.notifyArea.lat ||
        !profile.notifyArea.lng
      ) {
        continue;
      }

      const distance = calculateHaversineDistanceMeters(
        latitude,
        longitude,
        profile.notifyArea.lat,
        profile.notifyArea.lng
      );

      const maxRadius = profile.notifyArea.radiusM || 3000;

      if (distance <= maxRadius) {
        // 2. Check 24-hour rate limit (max 3 alerts per day)
        const [recentAlertsRow] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, profile.userId),
              eq(notifications.type, "shop_went_live_nearby"),
              gte(notifications.createdAt, twentyFourHoursAgo)
            )
          );

        const recentAlerts = recentAlertsRow?.count || 0;
        if (recentAlerts >= 3) {
          continue; // Rate limited for this user
        }

        // 3. Create in-app notification (contains no personal details)
        const notificationId = `notif_${crypto.randomUUID()}`;
        await db.insert(notifications).values({
          id: notificationId,
          userId: profile.userId,
          type: "shop_went_live_nearby",
          payload: {
            shopId,
            shopName,
            locality: locality || "",
            distanceMeters: distance,
            message: `${shopName} is now live and accepting print orders in your saved area.`,
          },
          createdAt: now,
        });

        // 4. Send Web Push
        await sendPushNotification(profile.userId, {
          title: "PrintSafe: Shop Live Nearby",
          body: `${shopName} is now open for printing in your saved area.`,
          url: `/app?shop=${shopId}`,
          tag: `shop-live-${shopId}`,
        });

        notifiedCount++;
      }
    }

    return notifiedCount;
  } catch (err) {
    console.warn("Failed to notify nearby customers of live shop:", err);
    return 0;
  }
}
