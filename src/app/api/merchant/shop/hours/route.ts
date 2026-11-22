import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, shopHours } from "@/lib/db/schema";
import crypto from "node:crypto";

export async function GET() {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.ownerId, session.user.id))
      .limit(1);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const hours = await db
      .select()
      .from(shopHours)
      .where(eq(shopHours.shopId, shop.id));

    return NextResponse.json({ hours });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch hours";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.ownerId, session.user.id))
      .limit(1);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const body = await req.json();
    const hoursInput = body.hours;

    if (!Array.isArray(hoursInput)) {
      return NextResponse.json(
        { error: "Invalid hours format, array expected." },
        { status: 400 }
      );
    }

    // Validate each day entry: weekday 0-6, opens HH:MM, closes HH:MM
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    for (const h of hoursInput) {
      if (
        typeof h.weekday !== "number" ||
        h.weekday < 0 ||
        h.weekday > 6 ||
        !timeRegex.test(h.opens) ||
        !timeRegex.test(h.closes)
      ) {
        return NextResponse.json(
          {
            error: `Invalid hour entry for weekday ${h.weekday}. Expected HH:MM format.`,
          },
          { status: 400 }
        );
      }
    }

    // Replace shop hours
    await db.delete(shopHours).where(eq(shopHours.shopId, shop.id));

    if (hoursInput.length > 0) {
      await db.insert(shopHours).values(
        hoursInput.map((h) => ({
          id: crypto.randomUUID(),
          shopId: shop.id,
          weekday: h.weekday,
          opens: h.opens,
          closes: h.closes,
        }))
      );
    }

    const updatedHours = await db
      .select()
      .from(shopHours)
      .where(eq(shopHours.shopId, shop.id));

    return NextResponse.json({ success: true, hours: updatedHours });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update hours";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
