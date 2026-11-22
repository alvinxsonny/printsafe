import { NextRequest, NextResponse } from "next/server";
import { eq, and, lte, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  documents,
  documentPages,
  printJobs,
  shopSubscriptions,
  shops,
  users,
  auditLogs,
} from "@/lib/db/schema";
import { deleteObject } from "@/lib/storage/client";
import { transitionJob } from "@/lib/jobs/machine";
import crypto from "node:crypto";

export async function GET(req: NextRequest) {
  return handleSweep(req);
}

export async function POST(req: NextRequest) {
  return handleSweep(req);
}

async function handleSweep(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET authorization (Task 4)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const customHeader = req.headers.get("x-cron-secret");

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : customHeader?.trim();

    if (!cronSecret || token !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid or missing cron secret." },
        { status: 401 }
      );
    }

    const now = new Date();
    const stats = {
      expiredDocuments: 0,
      abandonedUploads: 0,
      staleJobs: 0,
      lapsedSubscriptions: 0,
      inactiveAccountsCleaned: 0,
    };

    // 2. Delete expired documents and their page caches from S3/R2 storage
    const expiredDocs = await db
      .select({ id: documents.id, storageKey: documents.storageKey })
      .from(documents)
      .where(lte(documents.expiresAt, now));

    for (const doc of expiredDocs) {
      const pages = await db
        .select({ storageKey: documentPages.storageKey })
        .from(documentPages)
        .where(eq(documentPages.documentId, doc.id));

      for (const p of pages) {
        if (p.storageKey) {
          try {
            await deleteObject(p.storageKey);
          } catch {
            // Ignore missing storage object
          }
        }
      }

      await db
        .delete(documentPages)
        .where(eq(documentPages.documentId, doc.id));

      if (doc.storageKey) {
        try {
          await deleteObject(doc.storageKey);
        } catch {
          // Ignore missing storage object
        }
      }

      await db.delete(documents).where(eq(documents.id, doc.id));
      stats.expiredDocuments++;
    }

    // 3. Delete leftover incoming/ objects (abandoned uploads > 24h)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const abandoned = await db
      .select({ id: documents.id, storageKey: documents.storageKey })
      .from(documents)
      .where(
        and(
          eq(documents.status, "processing"),
          lte(documents.createdAt, twentyFourHoursAgo)
        )
      );

    for (const up of abandoned) {
      if (up.storageKey) {
        try {
          await deleteObject(up.storageKey);
        } catch {
          // Ignore
        }
      }
      await db.delete(documents).where(eq(documents.id, up.id));
      stats.abandonedUploads++;
    }

    // 4. Expire stale requests
    const staleJobs = await db
      .select({ id: printJobs.id, status: printJobs.status })
      .from(printJobs)
      .where(
        and(
          inArray(printJobs.status, [
            "requested",
            "awaiting_payment",
            "accepted",
          ]),
          lte(printJobs.expiresAt, now)
        )
      );

    for (const job of staleJobs) {
      try {
        await transitionJob({
          jobId: job.id,
          action: "expire",
          actor: { id: "cron_system", role: "admin" },
          reason: "Automated daily sweep: request expired unanswered.",
        });
        stats.staleJobs++;
      } catch {
        // Continue
      }
    }

    // 5. Lapse subscriptions
    const expiredSubs = await db
      .select({ id: shopSubscriptions.id, shopId: shopSubscriptions.shopId })
      .from(shopSubscriptions)
      .where(
        and(
          eq(shopSubscriptions.status, "active"),
          lte(shopSubscriptions.periodEnd, now)
        )
      );

    for (const sub of expiredSubs) {
      await db
        .update(shopSubscriptions)
        .set({ status: "expired" })
        .where(eq(shopSubscriptions.id, sub.id));

      // Force shop offline upon subscription lapse
      await db
        .update(shops)
        .set({ manualLive: false })
        .where(eq(shops.id, sub.shopId));

      stats.lapsedSubscriptions++;
    }

    // 6. Inactive accounts cleanup (> 365 days)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const inactiveUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(lte(users.updatedAt, oneYearAgo));

    for (const u of inactiveUsers) {
      await db
        .update(users)
        .set({
          email: `inactive_${u.id.slice(0, 8)}@anonymized.printsafe.local`,
          name: "Inactive User",
          alias: "Anonymous Inactive",
          updatedAt: now,
        })
        .where(eq(users.id, u.id));
      stats.inactiveAccountsCleaned++;
    }

    // Audit entry for sweep
    await db.insert(auditLogs).values({
      id: `audit_${crypto.randomUUID()}`,
      actorId: "cron_worker",
      actorRole: "admin",
      action: "cron_sweep_completed",
      entity: "system",
      entityId: "daily_sweep",
      meta: stats,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      swept: stats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Daily sweep failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
