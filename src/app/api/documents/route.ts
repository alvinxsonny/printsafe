import { NextResponse } from "next/server";
import { eq, and, ne, gte, desc, sql } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { documents, customerProfiles, plans } from "@/lib/db/schema";

export async function GET() {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "customer" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user documents
    const userDocs = await db
      .select({
        id: documents.id,
        displayName: documents.displayName,
        mime: documents.mime,
        sizeBytes: documents.sizeBytes,
        pageCount: documents.pageCount,
        status: documents.status,
        defaultSettings: documents.defaultSettings,
        deleteAfterPrint: documents.deleteAfterPrint,
        expiresAt: documents.expiresAt,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.ownerId, session.user.id),
          ne(documents.status, "deleted")
        )
      )
      .orderBy(desc(documents.createdAt));

    // 2. Fetch Plan limits and quotas
    let maxUploadsPerMonth = 10;
    let maxVaultBytes = 100 * 1024 * 1024;
    let planName = "Free";

    const profileRows = await db
      .select({
        planName: plans.name,
        planLimits: plans.limits,
      })
      .from(customerProfiles)
      .leftJoin(plans, eq(customerProfiles.planId, plans.id))
      .where(eq(customerProfiles.userId, session.user.id))
      .limit(1);

    if (profileRows.length > 0 && profileRows[0].planLimits) {
      planName = profileRows[0].planName || "Free";
      const limits = profileRows[0].planLimits;
      if (limits.uploads_per_month) {
        maxUploadsPerMonth = limits.uploads_per_month;
      }
      if (limits.vault_mb) {
        maxVaultBytes = limits.vault_mb * 1024 * 1024;
      }
    }

    // Monthly uploads used (past 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentUploads = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.ownerId, session.user.id),
          gte(documents.createdAt, thirtyDaysAgo)
        )
      );

    const usedUploads = Number(recentUploads[0]?.count || 0);

    // Total vault storage used
    const totalBytes = userDocs.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);

    return NextResponse.json({
      documents: userDocs,
      quota: {
        planName,
        usedUploads,
        maxUploads: maxUploadsPerMonth,
        usedBytes: totalBytes,
        maxBytes: maxVaultBytes,
        usedMb: (totalBytes / (1024 * 1024)).toFixed(1),
        maxMb: Math.round(maxVaultBytes / (1024 * 1024)),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load documents";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
