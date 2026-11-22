import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  shops,
  shopSubscriptions,
  plans,
  printJobs,
  documents,
  customerProfiles,
} from "@/lib/db/schema";
import { PLANS } from "@/config/plans";

export interface CanAcceptJobResult {
  allowed: boolean;
  reason?: string;
  remainingJobs?: number;
  remainingCustomers?: number | null;
}

export interface CanUploadResult {
  allowed: boolean;
  reason?: string;
  usedUploads?: number;
  maxUploads?: number;
  usedBytes?: number;
  maxBytes?: number;
}

/**
 * Checks whether a print shop can accept new customer jobs based on its subscription and plan limits.
 */
export async function canAcceptJob(
  shopId: string
): Promise<CanAcceptJobResult> {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  if (!shop) {
    return { allowed: false, reason: "Shop not found" };
  }

  if (shop.status !== "approved") {
    return {
      allowed: false,
      reason: `Shop is not approved (current status: ${shop.status})`,
    };
  }

  const [sub] = await db
    .select()
    .from(shopSubscriptions)
    .where(eq(shopSubscriptions.shopId, shopId))
    .limit(1);

  if (!sub) {
    return { allowed: false, reason: "No active subscription found for shop" };
  }

  const now = new Date();
  const validStatuses = ["trial", "active", "grace"];
  if (!validStatuses.includes(sub.status)) {
    return { allowed: false, reason: `Shop subscription is ${sub.status}` };
  }

  // Grace period check (allow up to 3 days after periodEnd if status is grace)
  const gracePeriodEnd = new Date(
    new Date(sub.periodEnd).getTime() +
      (sub.status === "grace" ? 3 * 86400000 : 0)
  );

  if (now.getTime() > gracePeriodEnd.getTime()) {
    return { allowed: false, reason: "Shop subscription period has expired" };
  }

  // Fetch plan
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, sub.planId))
    .limit(1);

  const fallbackPlan = PLANS.find((p) => p.id === sub.planId) || PLANS[1]; // default growth
  const planLimits = plan?.limits || fallbackPlan.limits;
  const planName = plan?.name || fallbackPlan.name;

  const periodStart = new Date(sub.periodStart);
  const periodEnd = new Date(sub.periodEnd);

  // Check job volume limit
  const [jobCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(printJobs)
    .where(
      and(
        eq(printJobs.shopId, shopId),
        gte(printJobs.requestedAt, periodStart),
        lte(printJobs.requestedAt, periodEnd)
      )
    );

  const currentJobs = jobCountRow?.count || 0;
  const jobsLimit = planLimits.jobs_per_month ?? 500;

  if (currentJobs >= jobsLimit) {
    return {
      allowed: false,
      reason: `Shop has reached its monthly quota of ${jobsLimit} print jobs on the ${planName} plan.`,
      remainingJobs: 0,
    };
  }

  // Check unique customer limit
  const [customerCountRow] = await db
    .select({
      count: sql<number>`count(distinct ${printJobs.customerId})::int`,
    })
    .from(printJobs)
    .where(
      and(
        eq(printJobs.shopId, shopId),
        gte(printJobs.requestedAt, periodStart),
        lte(printJobs.requestedAt, periodEnd)
      )
    );

  const currentCustomers = customerCountRow?.count || 0;
  const customersLimit = planLimits.customers_per_month ?? null;

  if (customersLimit !== null && currentCustomers >= customersLimit) {
    return {
      allowed: false,
      reason: `Shop has reached its monthly unique customer limit of ${customersLimit} on the ${planName} plan.`,
      remainingCustomers: 0,
    };
  }

  return {
    allowed: true,
    remainingJobs: jobsLimit - currentJobs,
    remainingCustomers:
      customersLimit !== null ? customersLimit - currentCustomers : null,
  };
}

/**
 * Checks whether a customer can upload a new file based on their account plan and vault limits.
 */
export async function canUpload(
  userId: string,
  newSizeBytes: number
): Promise<CanUploadResult> {
  // Fetch customer profile & plan
  const [profile] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.userId, userId))
    .limit(1);

  let planLimits = {
    uploads_per_month: 20,
    vault_mb: 50,
  };

  if (profile?.planId) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, profile.planId))
      .limit(1);

    if (plan?.limits) {
      planLimits = {
        uploads_per_month: plan.limits.uploads_per_month ?? 20,
        vault_mb: plan.limits.vault_mb ?? 50,
      };
    }
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Check monthly uploads
  const [uploadCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(
      and(eq(documents.ownerId, userId), gte(documents.createdAt, startOfMonth))
    );

  const usedUploads = uploadCountRow?.count || 0;
  const maxUploads = planLimits.uploads_per_month;

  if (usedUploads >= maxUploads) {
    return {
      allowed: false,
      reason: `You have reached your monthly upload limit of ${maxUploads} documents. Upgrade to Plus for unlimited uploads.`,
      usedUploads,
      maxUploads,
    };
  }

  // 2. Check total vault storage
  const [vaultBytesRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${documents.sizeBytes}), 0)::bigint`,
    })
    .from(documents)
    .where(
      and(eq(documents.ownerId, userId), sql`${documents.status} != 'deleted'`)
    );

  const usedBytes = Number(vaultBytesRow?.total || 0);
  const maxBytes = planLimits.vault_mb * 1024 * 1024;

  if (usedBytes + newSizeBytes > maxBytes) {
    return {
      allowed: false,
      reason: `Vault storage limit of ${planLimits.vault_mb}MB reached. Delete older documents or upgrade to Plus for 500MB storage.`,
      usedBytes,
      maxBytes,
    };
  }

  return {
    allowed: true,
    usedUploads,
    maxUploads,
    usedBytes,
    maxBytes,
  };
}
