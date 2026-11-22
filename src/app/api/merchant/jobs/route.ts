import { NextResponse } from "next/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, printJobs, users, documents } from "@/lib/db/schema";
import { isJobExpired } from "@/lib/jobs/machine";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";

    // Build conditions
    const conditions = [eq(printJobs.shopId, shop.id)];

    if (filter === "requested" || filter === "pending") {
      conditions.push(eq(printJobs.status, "requested"));
    } else if (filter === "active") {
      conditions.push(
        inArray(printJobs.status, [
          "accepted",
          "awaiting_payment",
          "paid",
          "unlocked",
          "printed",
        ])
      );
    } else if (filter === "completed") {
      conditions.push(
        inArray(printJobs.status, [
          "completed",
          "rejected",
          "cancelled",
          "expired",
        ])
      );
    }

    // Select sanitized fields only: NEVER select customer phone, email, or doc file name!
    const jobRows = await db
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
      .where(and(...conditions))
      .orderBy(desc(printJobs.requestedAt));

    // Handle dynamic expiry on read for requested jobs
    const sanitizedJobs = await Promise.all(
      jobRows.map(async (j) => {
        let currentStatus = j.status;
        if (currentStatus === "requested" && isJobExpired(j)) {
          currentStatus = "expired";
          // Mark expired in database
          await db
            .update(printJobs)
            .set({ status: "expired" })
            .where(eq(printJobs.id, j.id));
        }

        return {
          id: j.id,
          mode: j.mode,
          status: currentStatus,
          settings: j.settings,
          sheets: j.sheets,
          quotePaise: j.quotePaise,
          codeAttempts: j.codeAttempts,
          codeExpiresAt: j.codeExpiresAt,
          unlockedUntil: j.unlockedUntil,
          requestedAt: j.requestedAt,
          acceptedAt: j.acceptedAt,
          paidAt: j.paidAt,
          printedAt: j.printedAt,
          completedAt: j.completedAt,
          expiresAt: j.expiresAt,
          customerAlias: j.customerAlias || "Customer",
          pageCount: j.pageCount || 1,
        };
      })
    );

    return NextResponse.json({ jobs: sanitizedJobs });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to load merchant jobs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
