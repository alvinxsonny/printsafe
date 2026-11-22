import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Invalid subscription payload. endpoint and keys required." },
        { status: 400 }
      );
    }

    // Check if subscription already exists for this endpoint
    const [existing] = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, session.user.id),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(pushSubscriptions)
        .set({ keys })
        .where(eq(pushSubscriptions.id, existing.id));

      return NextResponse.json({ success: true, updated: true });
    }

    const id = `push_${crypto.randomUUID()}`;
    await db.insert(pushSubscriptions).values({
      id,
      userId: session.user.id,
      endpoint,
      keys,
    });

    return NextResponse.json({ success: true, subscribed: true, id });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to register push subscription";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
