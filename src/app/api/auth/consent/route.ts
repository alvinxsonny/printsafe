import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { users, auditLogs } from "@/lib/db/schema";
import { CURRENT_POLICY_VERSION } from "@/config/app";
import crypto from "node:crypto";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({
        needsConsent: false,
        currentPolicyVersion: CURRENT_POLICY_VERSION,
      });
    }

    const [user] = await db
      .select({ policyVersion: users.policyVersion })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const userVersion = user?.policyVersion ?? null;
    const needsConsent = userVersion !== CURRENT_POLICY_VERSION;

    return NextResponse.json({
      needsConsent,
      userPolicyVersion: userVersion,
      currentPolicyVersion: CURRENT_POLICY_VERSION,
    });
  } catch {
    return NextResponse.json({
      needsConsent: false,
      currentPolicyVersion: CURRENT_POLICY_VERSION,
    });
  }
}

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    await db
      .update(users)
      .set({
        consentAt: now,
        policyVersion: CURRENT_POLICY_VERSION,
        updatedAt: now,
      })
      .where(eq(users.id, session.user.id));

    // Audit log for consent record (Phase 15 Task 2)
    await db.insert(auditLogs).values({
      id: `audit_${crypto.randomUUID()}`,
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "consent_accepted",
      entity: "users",
      entityId: session.user.id,
      meta: {
        policyVersion: CURRENT_POLICY_VERSION,
        consentAt: now.toISOString(),
      },
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      policyVersion: CURRENT_POLICY_VERSION,
      consentAt: now.toISOString(),
      message: "Consent recorded successfully.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record consent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
