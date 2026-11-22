import { NextResponse } from "next/server";
import sharp from "sharp";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, printJobs, documents, viewLogs } from "@/lib/db/schema";
import { parsePageRange } from "@/lib/jobs/quote";
import { renderPage } from "@/lib/documents/render";
import { checkRateLimit } from "@/lib/security/rateLimit";
import crypto from "node:crypto";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string; n: string }> }
) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, n: pageParam } = await params;
    const pageNo = parseInt(pageParam, 10);

    if (isNaN(pageNo) || pageNo < 1) {
      return NextResponse.json(
        { error: "Invalid page number" },
        { status: 400 }
      );
    }

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

    // 5. Page Range Verification
    const totalPages = doc.pageCount || 1;
    const requestedPages = parsePageRange(job.settings.pages, totalPages);

    if (!requestedPages.includes(pageNo)) {
      return NextResponse.json(
        {
          error: `Page ${pageNo} is outside the customer's requested print range (${job.settings.pages || "all"}).`,
        },
        { status: 403 }
      );
    }

    // 6. Rate Limiting (120 page views per 10 minutes per merchant session)
    const rateLimit = await checkRateLimit(
      `viewer:${job.id}:${session.user.id}`,
      120,
      600
    );

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Viewing rate limit exceeded. Please wait a few moments." },
        { status: 429 }
      );
    }

    // 7. Render/Fetch page
    const renderResult = await renderPage(doc.id, pageNo);

    // Apply color mode setting (grayscale if black & white requested)
    let pageBuffer = renderResult.pageBuffer;
    if (job.settings.color === false) {
      pageBuffer = await sharp(renderResult.pageBuffer)
        .grayscale()
        .webp({ quality: 90 })
        .toBuffer();
    }

    // 8. Log view access in view_logs
    await db.insert(viewLogs).values({
      id: crypto.randomUUID(),
      jobId: job.id,
      shopId: shop?.id || "ADMIN",
      pageNo,
    });

    // 9. Return clean high-res WebP page (watermark overlay is applied client-side in preview only)
    return new NextResponse(new Uint8Array(pageBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Content-Disposition": `inline; filename="job-${job.id.slice(0, 8)}-page-${pageNo}.webp"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load page";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
