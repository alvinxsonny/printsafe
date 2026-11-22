import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { env } from "@/lib/env";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [sub] = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, session.user.id))
      .limit(1);

    return NextResponse.json({
      isSubscribed: Boolean(sub),
      vapidPublicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to fetch push status";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
