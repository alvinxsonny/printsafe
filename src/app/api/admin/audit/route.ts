import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const query = searchParams.get("q")?.toLowerCase();

    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt));

    let filtered = logs;

    if (action && action !== "all") {
      filtered = filtered.filter((l) => l.action === action);
    }

    if (query) {
      filtered = filtered.filter(
        (l) =>
          l.actorId.toLowerCase().includes(query) ||
          l.action.toLowerCase().includes(query) ||
          l.entity.toLowerCase().includes(query) ||
          l.entityId.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      logs: filtered,
      total: filtered.length,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to load audit logs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
