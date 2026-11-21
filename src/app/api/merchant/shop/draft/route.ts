import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, shopHours } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Check existing shop for this owner
    const existing = await db
      .select()
      .from(shops)
      .where(eq(shops.ownerId, session.user.id))
      .limit(1);

    const shopId =
      existing.length > 0 ? existing[0].id : body.id || crypto.randomUUID();

    const shopPayload = {
      name:
        body.name || (existing.length > 0 ? existing[0].name : "Draft Shop"),
      addressLine:
        body.addressLine !== undefined
          ? body.addressLine
          : existing.length > 0
            ? existing[0].addressLine
            : "",
      locality:
        body.locality !== undefined
          ? body.locality
          : existing.length > 0
            ? existing[0].locality
            : null,
      city:
        body.city !== undefined
          ? body.city
          : existing.length > 0
            ? existing[0].city
            : "",
      state:
        body.state !== undefined
          ? body.state
          : existing.length > 0
            ? existing[0].state
            : "",
      pincode:
        body.pincode !== undefined
          ? body.pincode
          : existing.length > 0
            ? existing[0].pincode
            : "",
      latitude:
        body.latitude !== undefined
          ? body.latitude
          : existing.length > 0
            ? existing[0].latitude
            : null,
      longitude:
        body.longitude !== undefined
          ? body.longitude
          : existing.length > 0
            ? existing[0].longitude
            : null,
      googleMapsUrl:
        body.googleMapsUrl !== undefined
          ? body.googleMapsUrl
          : existing.length > 0
            ? existing[0].googleMapsUrl
            : null,
      googleFtid:
        body.googleFtid !== undefined
          ? body.googleFtid
          : existing.length > 0
            ? existing[0].googleFtid
            : null,
      extraction:
        body.extraction !== undefined
          ? body.extraction
          : existing.length > 0
            ? existing[0].extraction
            : null,
      services:
        body.services !== undefined
          ? body.services
          : existing.length > 0
            ? existing[0].services
            : { bw: true, color: true, a3: false, duplex: true },
      priceBwPaise:
        body.priceBwPaise !== undefined
          ? body.priceBwPaise
          : existing.length > 0
            ? existing[0].priceBwPaise
            : 200,
      priceColorPaise:
        body.priceColorPaise !== undefined
          ? body.priceColorPaise
          : existing.length > 0
            ? existing[0].priceColorPaise
            : 1000,
      contactPhone:
        body.contactPhone !== undefined
          ? body.contactPhone
          : existing.length > 0
            ? existing[0].contactPhone
            : null,
      showPhone:
        body.showPhone !== undefined
          ? body.showPhone
          : existing.length > 0
            ? existing[0].showPhone
            : false,
      gstin:
        body.gstin !== undefined
          ? body.gstin
          : existing.length > 0
            ? existing[0].gstin
            : null,
      storefrontPhotoKey:
        body.storefrontPhotoKey !== undefined
          ? body.storefrontPhotoKey
          : existing.length > 0
            ? existing[0].storefrontPhotoKey
            : null,
      scheduleEnabled:
        body.scheduleEnabled !== undefined
          ? body.scheduleEnabled
          : existing.length > 0
            ? existing[0].scheduleEnabled
            : false,
    };

    if (existing.length > 0) {
      await db.update(shops).set(shopPayload).where(eq(shops.id, shopId));
    } else {
      await db.insert(shops).values({
        id: shopId,
        ownerId: session.user.id,
        status: "draft",
        ...shopPayload,
      });
    }

    // Update hours if provided
    if (Array.isArray(body.hours)) {
      await db.delete(shopHours).where(eq(shopHours.shopId, shopId));
      if (body.hours.length > 0) {
        await db.insert(shopHours).values(
          body.hours.map(
            (h: { weekday: number; opens: string; closes: string }) => ({
              id: crypto.randomUUID(),
              shopId,
              weekday: h.weekday,
              opens: h.opens,
              closes: h.closes,
            })
          )
        );
      }
    }

    return NextResponse.json({ success: true, shopId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save draft";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
