import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, printJobs, auditLogs } from "@/lib/db/schema";
import { verifyPasscode } from "@/lib/jobs/passcode";
import { transitionJob } from "@/lib/jobs/machine";
import crypto from "node:crypto";

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

    const body = await req.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!code || code.length !== 4) {
      return NextResponse.json(
        { error: "4-digit passcode required." },
        { status: 400 }
      );
    }

    // Check lock status
    if (job.codeAttempts >= 3) {
      return NextResponse.json(
        {
          error:
            "Passcode locked after 3 failed attempts. The customer must regenerate the code from their device.",
          isLocked: true,
        },
        { status: 400 }
      );
    }

    // Check expiration
    if (job.codeExpiresAt && new Date() > new Date(job.codeExpiresAt)) {
      return NextResponse.json(
        {
          error:
            "Passcode has expired. The customer must regenerate the code from their tracker.",
          isExpired: true,
        },
        { status: 400 }
      );
    }

    if (!job.codeEnc) {
      return NextResponse.json(
        { error: "No active handover passcode found for this job." },
        { status: 400 }
      );
    }

    // Verify passcode
    const isValid = verifyPasscode(code, job.codeEnc);

    if (!isValid) {
      const newAttempts = job.codeAttempts + 1;
      await db
        .update(printJobs)
        .set({ codeAttempts: newAttempts })
        .where(eq(printJobs.id, job.id));

      if (newAttempts >= 3) {
        await db.insert(auditLogs).values({
          id: crypto.randomUUID(),
          actorId: session.user.id,
          actorRole: "merchant",
          action: "job_code_locked",
          entity: "print_job",
          entityId: job.id,
          meta: { note: "Code locked after 3 failed merchant attempts." },
        });
      }

      const remaining = Math.max(0, 3 - newAttempts);
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Incorrect passcode. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
              : "Incorrect passcode. Job code is now locked. Customer must regenerate.",
          attemptsRemaining: remaining,
          isLocked: newAttempts >= 3,
        },
        { status: 400 }
      );
    }

    // Valid passcode -> unlock job
    const result = await transitionJob({
      jobId,
      action: "unlock",
      actor: { id: session.user.id, role: "merchant" },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: "unlocked",
      unlockedUntil: result.newStatus,
      message: "Passcode verified! Document viewer is now unlocked.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
