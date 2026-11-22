import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, printJobs, documents, viewLogs } from "@/lib/db/schema";
import { getObject } from "@/lib/storage/client";
import { unwrapDataKey, decryptBlob } from "@/lib/storage/crypto";
import crypto from "node:crypto";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    // 1. Fetch merchant's shop
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.ownerId, session.user.id))
      .limit(1);

    if (!shop && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Merchant shop not found" },
        { status: 403 }
      );
    }

    // 2. Fetch print job
    const [job] = await db
      .select()
      .from(printJobs)
      .where(
        session.user.role === "admin"
          ? eq(printJobs.id, jobId)
          : and(eq(printJobs.id, jobId), eq(printJobs.shopId, shop.id))
      )
      .limit(1);

    if (!job) {
      return NextResponse.json(
        { error: "Print job not found for this shop" },
        { status: 404 }
      );
    }

    // 3. Status and Access Window Checks
    if (job.status !== "unlocked") {
      return NextResponse.json(
        {
          error:
            job.status === "printed" || job.status === "completed"
              ? "Access ended. This document has already been marked as printed."
              : `Job is not unlocked for viewing (current status: '${job.status}').`,
        },
        { status: 403 }
      );
    }

    if (!job.unlockedUntil || new Date() > new Date(job.unlockedUntil)) {
      return NextResponse.json(
        { error: "Secure viewing window has expired for this job." },
        { status: 403 }
      );
    }

    // 4. Fetch document record
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, job.documentId))
      .limit(1);

    if (!doc || doc.status === "deleted") {
      return NextResponse.json(
        { error: "Document is unavailable or has been deleted." },
        { status: 404 }
      );
    }

    // 5. Fetch document from storage
    const rawPdf = await getObject(doc.storageKey);
    let plainPdfBuffer = rawPdf;

    // If stored with legacy encryption, decrypt it
    if (
      doc.wrappedKey &&
      rawPdf.length >= 28 &&
      rawPdf.subarray(0, 4).toString() !== "%PDF"
    ) {
      try {
        const dataKey = unwrapDataKey(doc.wrappedKey);
        plainPdfBuffer = decryptBlob(rawPdf, dataKey);
      } catch {
        plainPdfBuffer = rawPdf;
      }
    }

    // 6. Log access
    await db.insert(viewLogs).values({
      id: crypto.randomUUID(),
      jobId: job.id,
      shopId: shop?.id || "ADMIN",
      pageNo: 1,
    });

    return new NextResponse(new Uint8Array(plainPdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="job-${job.id.slice(0, 8)}.pdf"`,
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load PDF";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
