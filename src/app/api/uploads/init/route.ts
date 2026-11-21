import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne, gte, sql } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { documents, customerProfiles, plans } from "@/lib/db/schema";
import { presignPut } from "@/lib/storage/client";
import { generateDataKey, wrapDataKey } from "@/lib/storage/crypto";
import { MAX_UPLOAD_MB, DEFAULT_RETENTION_DAYS } from "@/config/app";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "customer" && session.user.role !== "admin")
    ) {
      return NextResponse.json(
        { error: "Unauthorized. Customer account required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { filename, mime, sizeBytes } = body;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "Filename is required." },
        { status: 400 }
      );
    }

    const normalizedMime = (mime || "").toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return NextResponse.json(
        {
          error:
            "Only PDF, JPG, PNG, and WebP files are supported. DOCX support is coming soon.",
        },
        { status: 400 }
      );
    }

    const maxBytes = MAX_UPLOAD_MB * 1024 * 1024;
    if (
      typeof sizeBytes !== "number" ||
      sizeBytes <= 0 ||
      sizeBytes > maxBytes
    ) {
      return NextResponse.json(
        {
          error: `File size exceeds the maximum limit of ${MAX_UPLOAD_MB} MB.`,
        },
        { status: 400 }
      );
    }

    // Check Plan & Quota
    // Defaults: Free tier (10 uploads/mo, 100 MB vault)
    let maxUploadsPerMonth = 10;
    let maxVaultBytes = 100 * 1024 * 1024;

    const profileRows = await db
      .select({
        planLimits: plans.limits,
      })
      .from(customerProfiles)
      .leftJoin(plans, eq(customerProfiles.planId, plans.id))
      .where(eq(customerProfiles.userId, session.user.id))
      .limit(1);

    if (profileRows.length > 0 && profileRows[0].planLimits) {
      const limits = profileRows[0].planLimits;
      if (limits.uploads_per_month) {
        maxUploadsPerMonth = limits.uploads_per_month;
      }
      if (limits.vault_mb) {
        maxVaultBytes = limits.vault_mb * 1024 * 1024;
      }
    }

    // 1. Check monthly uploads quota (last 30 days)
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

    const uploadsCount = Number(recentUploads[0]?.count || 0);
    if (uploadsCount >= maxUploadsPerMonth) {
      return NextResponse.json(
        {
          error: `Monthly upload quota reached (${uploadsCount}/${maxUploadsPerMonth} uploads used). Upgrade to Plus for 100 uploads/month.`,
        },
        { status: 403 }
      );
    }

    // 2. Check total vault storage quota
    const storageSum = await db
      .select({
        totalBytes: sql<number>`coalesce(sum(${documents.sizeBytes}), 0)`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.ownerId, session.user.id),
          ne(documents.status, "deleted")
        )
      );

    const currentVaultBytes = Number(storageSum[0]?.totalBytes || 0);
    if (currentVaultBytes + sizeBytes > maxVaultBytes) {
      const maxMb = Math.round(maxVaultBytes / (1024 * 1024));
      return NextResponse.json(
        {
          error: `Vault storage limit of ${maxMb} MB exceeded. Please delete old documents or upgrade to Plus for 2 GB storage.`,
        },
        { status: 403 }
      );
    }

    // Generate Document ID, Data Key, and Envelope Wrapping
    const documentId = `doc_${crypto.randomUUID()}`;
    const dataKey = generateDataKey();
    const wrappedKey = wrapDataKey(dataKey);

    const incomingKey = `incoming/${documentId}`;
    const expiresAt = new Date(
      Date.now() + DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );

    // Create document in processing state
    await db.insert(documents).values({
      id: documentId,
      ownerId: session.user.id,
      displayName: filename.trim(),
      mime: normalizedMime,
      sizeBytes,
      storageKey: incomingKey,
      wrappedKey,
      status: "processing",
      expiresAt,
    });

    // Generate direct presigned PUT URL to Cloudflare R2
    const uploadUrl = await presignPut(incomingKey, normalizedMime, 900);

    return NextResponse.json({
      success: true,
      documentId,
      uploadUrl,
      incomingKey,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Upload initialization failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
