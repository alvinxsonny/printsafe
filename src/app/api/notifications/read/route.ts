import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, all } = body;
    const now = new Date();

    if (all) {
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(
            eq(notifications.userId, session.user.id),
            isNull(notifications.readAt)
          )
        );

      return NextResponse.json({ success: true, markedAll: true });
    }

    if (id && typeof id === "string") {
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(
            eq(notifications.id, id),
            eq(notifications.userId, session.user.id)
          )
        );

      return NextResponse.json({ success: true, markedId: id });
    }

    return NextResponse.json(
      { error: "Provide notification id or all: true" },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to mark as read";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
