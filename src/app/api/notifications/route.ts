import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, sql, isNull } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const baseWhere = unreadOnly
      ? and(
          eq(notifications.userId, session.user.id),
          isNull(notifications.readAt)
        )
      : eq(notifications.userId, session.user.id);

    const [rows, [unreadCountRow]] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(baseWhere)
        .orderBy(desc(notifications.createdAt))
        .limit(50),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, session.user.id),
            isNull(notifications.readAt)
          )
        ),
    ]);

    const unreadCount = unreadCountRow?.count || 0;

    return NextResponse.json(
      {
        notifications: rows,
        unreadCount,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to fetch notifications";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
