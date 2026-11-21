import { NextRequest, NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const query = searchParams.get("q")?.toLowerCase();

    // Fetch shops ordered newest pending first
    const allShops = await db
      .select({
        id: shops.id,
        name: shops.name,
        status: shops.status,
        addressLine: shops.addressLine,
        locality: shops.locality,
        city: shops.city,
        state: shops.state,
        pincode: shops.pincode,
        contactPhone: shops.contactPhone,
        priceBwPaise: shops.priceBwPaise,
        priceColorPaise: shops.priceColorPaise,
        createdAt: shops.createdAt,
        approvedAt: shops.approvedAt,
      })
      .from(shops)
      .orderBy(
        sql`CASE WHEN ${shops.status} = 'pending_review' THEN 0 ELSE 1 END`,
        desc(shops.createdAt)
      );

    let filtered = allShops;

    if (status && status !== "all") {
      filtered = filtered.filter((s) => s.status === status);
    }

    if (query) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.city.toLowerCase().includes(query) ||
          (s.addressLine && s.addressLine.toLowerCase().includes(query))
      );
    }

    return NextResponse.json({
      shops: filtered,
      total: filtered.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load merchants";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
