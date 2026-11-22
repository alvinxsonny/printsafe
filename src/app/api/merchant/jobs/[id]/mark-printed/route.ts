import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, printJobs } from "@/lib/db/schema";
import { transitionJob } from "@/lib/jobs/machine";

export async function POST(
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

    const [job] = await db
      .select()
      .from(printJobs)
      .where(and(eq(printJobs.id, jobId), eq(printJobs.shopId, shop.id)))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const result = await transitionJob({
      jobId,
      action: "mark_printed",
      actor: { id: session.user.id, role: "merchant" },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: "printed",
      message: "Job marked as printed. Viewer access has ended.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark printed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
