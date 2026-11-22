import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, printJobs, users, documents } from "@/lib/db/schema";
import { isJobExpired } from "@/lib/jobs/machine";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await params;

    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.ownerId, session.user.id))
      .limit(1);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const [jobRow] = await db
      .select({
        id: printJobs.id,
        mode: printJobs.mode,
        status: printJobs.status,
        settings: printJobs.settings,
        sheets: printJobs.sheets,
        quotePaise: printJobs.quotePaise,
        codeAttempts: printJobs.codeAttempts,
        codeExpiresAt: printJobs.codeExpiresAt,
        unlockedUntil: printJobs.unlockedUntil,
        requestedAt: printJobs.requestedAt,
        acceptedAt: printJobs.acceptedAt,
        paidAt: printJobs.paidAt,
        printedAt: printJobs.printedAt,
        completedAt: printJobs.completedAt,
        expiresAt: printJobs.expiresAt,
        customerAlias: users.alias,
        pageCount: documents.pageCount,
      })
      .from(printJobs)
      .leftJoin(users, eq(printJobs.customerId, users.id))
      .leftJoin(documents, eq(printJobs.documentId, documents.id))
      .where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shop.id)))
      .limit(1);

    if (!jobRow) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let status = jobRow.status;
    if (status === "requested" && isJobExpired(jobRow)) {
      status = "expired";
      await db
        .update(printJobs)
        .set({ status: "expired" })
        .where(eq(printJobs.id, jobId));
    }

    const isLocked = jobRow.codeAttempts >= 3;
    const isCodeExpired =
      jobRow.codeExpiresAt !== null &&
      new Date().getTime() > new Date(jobRow.codeExpiresAt).getTime();

    return NextResponse.json({
      job: {
        id: jobRow.id,
        mode: jobRow.mode,
        status,
        settings: jobRow.settings,
        sheets: jobRow.sheets,
        quotePaise: jobRow.quotePaise,
        codeAttempts: jobRow.codeAttempts,
        isLocked,
        isCodeExpired,
        codeExpiresAt: jobRow.codeExpiresAt,
        unlockedUntil: jobRow.unlockedUntil,
        requestedAt: jobRow.requestedAt,
        acceptedAt: jobRow.acceptedAt,
        paidAt: jobRow.paidAt,
        printedAt: jobRow.printedAt,
        completedAt: jobRow.completedAt,
        expiresAt: jobRow.expiresAt,
        customerAlias: jobRow.customerAlias || "Customer",
        pageCount: jobRow.pageCount || 1,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load job";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
