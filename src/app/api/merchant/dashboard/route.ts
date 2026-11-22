import { NextResponse } from "next/server";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
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

export async function GET() {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.ownerId, session.user.id))
      .limit(1);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // 1. Fetch Hours
    const hours = await db
      .select()
      .from(shopHours)
      .where(eq(shopHours.shopId, shop.id));

    // 2. Fetch Subscription & Plan
    const [sub] = await db
      .select()
      .from(shopSubscriptions)
      .where(eq(shopSubscriptions.shopId, shop.id))
      .limit(1);

    let planData = null;
    if (sub) {
      const [p] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, sub.planId))
        .limit(1);
      planData = p || null;
    }

    // 3. Live State
    const isLive = isShopLive(shop, hours, sub || null);

    // 4. Usage Metrics
    const now = new Date();
    // Midnight today in UTC / local
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // Subscription period boundaries
    const periodStart = sub
      ? new Date(sub.periodStart)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = sub
      ? new Date(sub.periodEnd)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Queries
    const [todayCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shop.id),
          gte(printJobs.requestedAt, todayStart)
        )
      );

    const [pendingCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(printJobs)
      .where(
        and(eq(printJobs.shopId, shop.id), eq(printJobs.status, "requested"))
      );

    const [activeCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shop.id),
          sql`${printJobs.status} IN ('accepted', 'awaiting_payment', 'paid', 'unlocked')`
        )
      );

    const [monthJobsCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shop.id),
          gte(printJobs.requestedAt, periodStart),
          lte(printJobs.requestedAt, periodEnd)
        )
      );

    const [monthCustomersCountRow] = await db
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
      );

    const monthJobs = monthJobsCountRow?.count || 0;
    const monthUniqueCustomers = monthCustomersCountRow?.count || 0;
    const jobsLimit = planData?.limits?.jobs_per_month ?? 100;
    const customersLimit = planData?.limits?.customers_per_month ?? 50;

    const isCapReached =
      (jobsLimit !== undefined && monthJobs >= jobsLimit) ||
      (customersLimit !== null &&
        customersLimit !== undefined &&
        monthUniqueCustomers >= customersLimit);

    // 5. Recent Jobs (strictly sanitized: NO file name, NO customer phone/email)
    const recentJobs = await db
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
      .limit(5);

    return NextResponse.json({
      shop,
      isLive,
      subscription: sub || null,
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
        periodEnd: sub?.periodEnd || null,
      },
      recentJobs: recentJobs.map((j) => ({
        ...j,
        customerAlias: j.customerAlias || "Customer",
      })),
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to load merchant dashboard";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
