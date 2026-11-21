import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { plans, auditLogs } from "@/lib/db/schema";
import type { PlanLimits } from "@/config/plans";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const { id: planId } = await params;
    const body = await req.json();
    const { pricePaise, periodDays, limits, active } = body;

    const existingRows = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const existingPlan = existingRows[0];

    const updatePayload: {
      pricePaise?: number;
      periodDays?: number;
      limits?: PlanLimits;
      active?: boolean;
    } = {};

    if (typeof pricePaise === "number" && pricePaise >= 0) {
      updatePayload.pricePaise = Math.round(pricePaise);
    }
    if (typeof periodDays === "number" && periodDays > 0) {
      updatePayload.periodDays = Math.round(periodDays);
    }
    if (limits && typeof limits === "object") {
      updatePayload.limits = limits as PlanLimits;
    }
    if (typeof active === "boolean") {
      updatePayload.active = active;
    }

    await db.update(plans).set(updatePayload).where(eq(plans.id, planId));

    // Write audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorId: session.user.id,
      actorRole: "admin",
      action: "plan.updated",
      entity: "plan",
      entityId: planId,
      meta: {
        planCode: existingPlan.code,
        oldPricePaise: existingPlan.pricePaise,
        newPricePaise: updatePayload.pricePaise ?? existingPlan.pricePaise,
        oldLimits: existingPlan.limits,
        newLimits: updatePayload.limits ?? existingPlan.limits,
        active: updatePayload.active ?? existingPlan.active,
      },
    });

    const updated = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    return NextResponse.json({ success: true, plan: updated[0] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update plan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
