import { eq, and, gte, lte, desc, sql, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  shops,
  shopHours,
  shopSubscriptions,
  plans,
  printJobs,
  users,
} from "@/lib/db/schema";
import { isShopLive } from "@/lib/db/queries";
import { PLANS } from "@/config/plans";

/**
 * Ensures an approved shop has a valid 30-day Growth trial subscription.
 */
export async function ensureGrowthSubscription(
  shopId: string
): Promise<typeof shopSubscriptions.$inferSelect> {
  const [existingSub] = await db
    .select()
    .from(shopSubscriptions)
    .where(eq(shopSubscriptions.shopId, shopId))
    .limit(1);

  if (existingSub) {
    return existingSub;
  }

  // Find or insert the Growth plan
  const growthPlans = await db
    .select()
    .from(plans)
    .where(
      or(
        eq(plans.id, "merchant_growth"),
        eq(plans.code, "growth"),
        eq(plans.code, "merchant_growth")
      )
    )
    .limit(1);

  let planId = growthPlans[0]?.id;
  if (!planId) {
    const def = PLANS.find((p) => p.id === "merchant_growth") || PLANS[1];
    await db
      .insert(plans)
      .values({
        id: def.id,
        audience: def.audience,
        code: def.code,
        name: def.name,
        pricePaise: def.pricePaise,
        periodDays: def.periodDays,
        limits: def.limits,
        active: def.active,
      })
      .onConflictDoNothing();
    planId = def.id;
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day trial
  const subId = crypto.randomUUID();

  await db.insert(shopSubscriptions).values({
    id: subId,
    shopId,
    planId,
    status: "trial",
    periodStart: now,
    periodEnd,
    paymentId: null,
  });

  return {
    id: subId,
    shopId,
    planId,
    status: "trial" as const,
    periodStart: now,
    periodEnd,
    paymentId: null,
  };
}

/**
 * Fetches all data needed for the merchant dashboard with parallel queries and auto-provisioned trial.
 */
export async function fetchMerchantDashboardData(userId: string) {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.ownerId, userId))
    .limit(1);

  if (!shop) return null;

  // If shop is approved, ensure trial subscription is active
  let [sub] = await db
    .select()
    .from(shopSubscriptions)
    .where(eq(shopSubscriptions.shopId, shop.id))
    .limit(1);

  if (!sub && shop.status === "approved") {
    sub = await ensureGrowthSubscription(shop.id);
  }

  const hours = await db
    .select()
    .from(shopHours)
    .where(eq(shopHours.shopId, shop.id));

  let planData = null;
  if (sub) {
    const [p] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1);
    planData = p || null;
  }

  const isLive = isShopLive(shop, hours, sub || null);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const periodStart = sub
    ? new Date(sub.periodStart)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = sub
    ? new Date(sub.periodEnd)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Parallelize count queries for fast load
  const [
    [todayCountRow],
    [pendingCountRow],
    [activeCountRow],
    [monthJobsCountRow],
    [monthCustomersCountRow],
    recentJobs,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shop.id),
          gte(printJobs.requestedAt, todayStart)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(printJobs)
      .where(
        and(eq(printJobs.shopId, shop.id), eq(printJobs.status, "requested"))
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shop.id),
          sql`${printJobs.status} IN ('accepted', 'awaiting_payment', 'paid', 'unlocked')`
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shop.id),
          gte(printJobs.requestedAt, periodStart),
          lte(printJobs.requestedAt, periodEnd)
        )
      ),
    db
      .select({
        count: sql<number>`count(distinct ${printJobs.customerId})::int`,
      })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shop.id),
          gte(printJobs.requestedAt, periodStart),
          lte(printJobs.requestedAt, periodEnd)
        )
      ),
    db
      .select({
        id: printJobs.id,
        mode: printJobs.mode,
        status: printJobs.status,
        sheets: printJobs.sheets,
        quotePaise: printJobs.quotePaise,
        requestedAt: printJobs.requestedAt,
        acceptedAt: printJobs.acceptedAt,
        customerAlias: users.alias,
      })
      .from(printJobs)
      .leftJoin(users, eq(printJobs.customerId, users.id))
      .where(eq(printJobs.shopId, shop.id))
      .orderBy(desc(printJobs.requestedAt))
      .limit(5),
  ]);

  const monthJobs = monthJobsCountRow?.count || 0;
  const monthUniqueCustomers = monthCustomersCountRow?.count || 0;
  const jobsLimit = planData?.limits?.jobs_per_month ?? 500;
  const customersLimit = planData?.limits?.customers_per_month ?? 250;

  const isCapReached =
    (jobsLimit !== undefined && monthJobs >= jobsLimit) ||
    (customersLimit !== null &&
      customersLimit !== undefined &&
      monthUniqueCustomers >= customersLimit);

  return {
    shop,
    isLive,
    subscription: sub
      ? {
          id: sub.id,
          status: sub.status,
          periodEnd:
            sub.periodEnd instanceof Date
              ? sub.periodEnd.toISOString()
              : String(sub.periodEnd),
        }
      : null,
    plan: planData,
    usage: {
      todayJobs: todayCountRow?.count || 0,
      pendingJobs: pendingCountRow?.count || 0,
      activeJobs: activeCountRow?.count || 0,
      monthJobs,
      monthUniqueCustomers,
      jobsLimit,
      customersLimit,
      isCapReached,
      periodEnd: sub
        ? sub.periodEnd instanceof Date
          ? sub.periodEnd.toISOString()
          : String(sub.periodEnd)
        : null,
    },
    recentJobs: recentJobs.map((j) => ({
      ...j,
      requestedAt:
        j.requestedAt instanceof Date
          ? j.requestedAt.toISOString()
          : String(j.requestedAt),
      acceptedAt: j.acceptedAt
        ? j.acceptedAt instanceof Date
          ? j.acceptedAt.toISOString()
          : String(j.acceptedAt)
        : null,
      customerAlias: j.customerAlias || "Customer",
    })),
  };
}
