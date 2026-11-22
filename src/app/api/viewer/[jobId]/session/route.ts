import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, printJobs, documents, users } from "@/lib/db/schema";
import { parsePageRange } from "@/lib/jobs/quote";
import { MAX_REOPENS } from "@/config/app";

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

    const [jobRow] = await db
      .select({
        id: printJobs.id,
        mode: printJobs.mode,
        status: printJobs.status,
        settings: printJobs.settings,
        sheets: printJobs.sheets,
        quotePaise: printJobs.quotePaise,
        openCount: printJobs.openCount,
        unlockedUntil: printJobs.unlockedUntil,
        documentId: printJobs.documentId,
        customerAlias: users.alias,
        pageCount: documents.pageCount,
        deleteAfterPrint: documents.deleteAfterPrint,
      })
      .from(printJobs)
      .leftJoin(users, eq(printJobs.customerId, users.id))
      .leftJoin(documents, eq(printJobs.documentId, documents.id))
      .where(
        session.user.role === "admin"
          ? eq(printJobs.id, jobId)
          : and(eq(printJobs.id, jobId), eq(printJobs.shopId, shop.id))
      )
      .limit(1);

    if (!jobRow) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (jobRow.status !== "unlocked") {
      return NextResponse.json(
        {
          error:
            jobRow.status === "printed" || jobRow.status === "completed"
              ? "Access ended. This job has already been printed."
              : `Job is not unlocked (current: '${jobRow.status}').`,
          status: jobRow.status,
        },
        { status: 403 }
      );
    }

    const isExpired =
      !jobRow.unlockedUntil || new Date() > new Date(jobRow.unlockedUntil);

    if (isExpired) {
      return NextResponse.json(
        { error: "Viewing window has expired.", isExpired: true },
        { status: 403 }
      );
    }

    // Increment open count
    const nextOpenCount = jobRow.openCount + 1;
    await db
      .update(printJobs)
      .set({ openCount: nextOpenCount })
      .where(eq(printJobs.id, jobRow.id));

    const totalPages = jobRow.pageCount || 1;
    const requestedPages = parsePageRange(jobRow.settings.pages, totalPages);

    return NextResponse.json({
      session: {
        id: jobRow.id,
        mode: jobRow.mode,
        status: jobRow.status,
        settings: jobRow.settings,
        sheets: jobRow.sheets,
        quotePaise: jobRow.quotePaise,
        unlockedUntil: jobRow.unlockedUntil,
        openCount: nextOpenCount,
        maxReopens: MAX_REOPENS,
        customerAlias: jobRow.customerAlias || "Customer",
        pageCount: totalPages,
        requestedPages,
        deleteAfterPrint: jobRow.deleteAfterPrint ?? false,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load session";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
