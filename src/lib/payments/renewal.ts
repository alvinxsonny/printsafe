import crypto from "node:crypto";
import { eq, and, lte, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  shopSubscriptions,
  shops,
  users,
  auditLogs,
  notifications,
  plans,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/notify/email";

/**
 * Handles merchant subscription renewal reminders (3 days before expiry)
 * and enforces the 3-day grace period rule.
 */
export async function processSubscriptionLifecycle(): Promise<{
  remindersSent: number;
  graceMarked: number;
  expiredMarked: number;
}> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  let remindersSent = 0;
  let graceMarked = 0;
  let expiredMarked = 0;

  // 1. Send renewal reminders for subscriptions expiring within 3 days
  const expiringSubs = await db
    .select({
      subId: shopSubscriptions.id,
      shopId: shopSubscriptions.shopId,
      shopName: shops.name,
      periodEnd: shopSubscriptions.periodEnd,
      planName: plans.name,
      ownerEmail: users.email,
      ownerId: users.id,
    })
    .from(shopSubscriptions)
    .innerJoin(shops, eq(shopSubscriptions.shopId, shops.id))
    .innerJoin(users, eq(shops.ownerId, users.id))
    .innerJoin(plans, eq(shopSubscriptions.planId, plans.id))
    .where(
      and(
        eq(shopSubscriptions.status, "active"),
        gte(shopSubscriptions.periodEnd, now),
        lte(shopSubscriptions.periodEnd, threeDaysFromNow)
      )
    );

  for (const item of expiringSubs) {
    try {
      const daysLeft = Math.max(
        1,
        Math.ceil(
          (new Date(item.periodEnd).getTime() - now.getTime()) /
            (24 * 60 * 60 * 1000)
        )
      );

      await sendEmail({
        to: item.ownerEmail,
        subject: `PrintSafe: Your ${item.planName} plan renews in ${daysLeft} days`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #14213D;">Subscription Renewal Reminder</h2>
            <p>Hello,</p>
            <p>Your subscription for <strong>${item.shopName}</strong> (${item.planName} tier) is set to expire on <strong>${new Date(item.periodEnd).toLocaleDateString()}</strong>.</p>
            <p>To avoid interruption to your print queue and customer map listing, please visit your merchant dashboard to renew or upgrade your plan.</p>
            <p style="margin-top: 24px;">Note: A 3-day grace period is provided after expiry before your store listing is paused.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">PrintSafe &bull; Zero-Trust Printing</p>
          </div>
        `,
      });

      await db.insert(notifications).values({
        id: `notif_${crypto.randomUUID()}`,
        userId: item.ownerId,
        type: "subscription_renewal_reminder",
        payload: {
          shopId: item.shopId,
          daysLeft,
          message: `Your ${item.planName} plan renews in ${daysLeft} days. Visit billing to renew.`,
        },
        createdAt: now,
      });

      remindersSent++;
    } catch (emailErr) {
      console.warn("Failed to send subscription renewal reminder:", emailErr);
    }
  }

  // 2. Mark active subscriptions that have passed periodEnd but are within 3 days as 'grace'
  const pastActiveSubs = await db
    .select()
    .from(shopSubscriptions)
    .where(
      and(
        eq(shopSubscriptions.status, "active"),
        lte(shopSubscriptions.periodEnd, now),
        gte(shopSubscriptions.periodEnd, threeDaysAgo)
      )
    );

  for (const sub of pastActiveSubs) {
    await db
      .update(shopSubscriptions)
      .set({ status: "grace" })
      .where(eq(shopSubscriptions.id, sub.id));

    await db.insert(auditLogs).values({
      id: `audit_${crypto.randomUUID()}`,
      actorId: "system",
      actorRole: "system",
      action: "subscription_grace_applied",
      entity: "shop_subscriptions",
      entityId: sub.id,
      meta: { shopId: sub.shopId, periodEnd: sub.periodEnd },
      createdAt: now,
    });

    graceMarked++;
  }

  // 3. Mark subscriptions that have passed the 3-day grace period as 'expired'
  const expiredGraceSubs = await db
    .select()
    .from(shopSubscriptions)
    .where(
      and(
        eq(shopSubscriptions.status, "grace"),
        lte(shopSubscriptions.periodEnd, threeDaysAgo)
      )
    );

  for (const sub of expiredGraceSubs) {
    await db
      .update(shopSubscriptions)
      .set({ status: "expired" })
      .where(eq(shopSubscriptions.id, sub.id));

    await db.insert(auditLogs).values({
      id: `audit_${crypto.randomUUID()}`,
      actorId: "system",
      actorRole: "system",
      action: "subscription_expired",
      entity: "shop_subscriptions",
      entityId: sub.id,
      meta: { shopId: sub.shopId, periodEnd: sub.periodEnd },
      createdAt: now,
    });

    expiredMarked++;
  }

  return { remindersSent, graceMarked, expiredMarked };
}
