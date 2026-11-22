import { NextResponse } from "next/server";
import { eq, and, gte } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { customerProfiles, printJobs } from "@/lib/db/schema";
import { SHEETS_PER_CANOPY_TIER, SHEETS_PER_TREE_APPROX } from "@/config/app";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [profile] = await db
      .select({
        sheetsPrintedTotal: customerProfiles.sheetsPrintedTotal,
      })
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, session.user.id))
      .limit(1);

    const sheetsPrintedTotal = profile?.sheetsPrintedTotal ?? 0;

    // Check if customer had zero completed jobs in the last 30 days (Phase 14 Task 4)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentJobs = await db
      .select({ id: printJobs.id })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.customerId, session.user.id),
          eq(printJobs.status, "completed"),
          gte(printJobs.completedAt, thirtyDaysAgo)
        )
      )
      .limit(1);

    const hasNoPrintsLast30Days = recentJobs.length === 0;

    return NextResponse.json({
      sheetsPrintedTotal,
      sheetsPerCanopyTier: SHEETS_PER_CANOPY_TIER,
      sheetsPerTreeApprox: SHEETS_PER_TREE_APPROX,
      hasNoPrintsLast30Days,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to load customer footprint";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
