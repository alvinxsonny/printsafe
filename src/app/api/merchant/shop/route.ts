import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, shopHours, shopReviews } from "@/lib/db/schema";

export async function GET() {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find shop owned by this merchant
    const merchantShops = await db
      .select()
      .from(shops)
      .where(eq(shops.ownerId, session.user.id))
      .limit(1);

    if (merchantShops.length === 0) {
      return NextResponse.json({ shop: null, hours: [], lastReview: null });
    }

    const shop = merchantShops[0];

    // Find hours
    const hours = await db
      .select()
      .from(shopHours)
      .where(eq(shopHours.shopId, shop.id));

    // Find any latest review notes (for changes_requested)
    const reviews = await db
      .select()
      .from(shopReviews)
      .where(eq(shopReviews.shopId, shop.id))
      .orderBy(desc(shopReviews.createdAt))
      .limit(1);

    return NextResponse.json({
      shop,
      hours,
      lastReview: reviews.length > 0 ? reviews[0] : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retrieve shop";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
