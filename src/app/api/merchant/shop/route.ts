import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import {
  shops,
  shopHours,
  shopReviews,
  shopSubscriptions,
  auditLogs,
} from "@/lib/db/schema";
import { isShopLive } from "@/lib/db/queries";
import { notifyShopLiveToNearbyCustomers } from "@/lib/notify/push";
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

    // Find subscription
    const [sub] = await db
      .select()
      .from(shopSubscriptions)
      .where(eq(shopSubscriptions.shopId, shop.id))
      .limit(1);

    // Find any latest review notes (for changes_requested)
    const reviews = await db
      .select()
      .from(shopReviews)
      .where(eq(shopReviews.shopId, shop.id))
      .orderBy(desc(shopReviews.createdAt))
      .limit(1);

    const isLive = isShopLive(shop, hours, sub || null);

    return NextResponse.json({
      shop,
      hours,
      subscription: sub || null,
      isLive,
      lastReview: reviews.length > 0 ? reviews[0] : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retrieve shop";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
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
    const updates: Partial<typeof shops.$inferInsert> = {};

    // 1. Manual Live Toggle Check
    if (typeof body.manualLive === "boolean") {
      if (body.manualLive) {
        // Can only turn on if approved and has active/trial subscription
        if (shop.status !== "approved") {
          return NextResponse.json(
            {
              error:
                "Shop must be approved by admin before going live. Current status: " +
                shop.status,
            },
            { status: 400 }
          );
        }

        const [sub] = await db
          .select()
          .from(shopSubscriptions)
          .where(eq(shopSubscriptions.shopId, shop.id))
          .limit(1);

        const validStatuses = ["trial", "active", "grace"];
        if (
          !sub ||
          !validStatuses.includes(sub.status) ||
          new Date() > new Date(sub.periodEnd)
        ) {
          return NextResponse.json(
            {
              error:
                "Active subscription or trial is required to toggle shop live.",
            },
            { status: 400 }
          );
        }
      }
      updates.manualLive = body.manualLive;
    }

    // 2. Pricing updates
    if (typeof body.priceBwPaise === "number" && body.priceBwPaise > 0) {
      updates.priceBwPaise = Math.round(body.priceBwPaise);
    }
    if (typeof body.priceColorPaise === "number" && body.priceColorPaise > 0) {
      updates.priceColorPaise = Math.round(body.priceColorPaise);
    }

    // 3. Services updates
    if (body.services && typeof body.services === "object") {
      updates.services = {
        bw: Boolean(body.services.bw),
        color: Boolean(body.services.color),
        a3: Boolean(body.services.a3),
        duplex: Boolean(body.services.duplex),
      };
    }

    // 4. Phone visibility
    if (typeof body.showPhone === "boolean") {
      updates.showPhone = body.showPhone;
    }
    if (typeof body.contactPhone === "string") {
      updates.contactPhone = body.contactPhone.trim();
    }

    // 5. Schedule Enable
    if (typeof body.scheduleEnabled === "boolean") {
      updates.scheduleEnabled = body.scheduleEnabled;
    }

    // 6. Critical details: name, address, location, gstin
    // Changes to these send shop back to pending_review
    let criticalChange = false;
    if (typeof body.name === "string" && body.name.trim() !== shop.name) {
      updates.name = body.name.trim();
      criticalChange = true;
    }
    if (
      typeof body.addressLine === "string" &&
      body.addressLine.trim() !== shop.addressLine
    ) {
      updates.addressLine = body.addressLine.trim();
      criticalChange = true;
    }
    if (
      typeof body.locality === "string" &&
      body.locality.trim() !== (shop.locality || "")
    ) {
      updates.locality = body.locality.trim();
    }
    if (typeof body.city === "string" && body.city.trim() !== shop.city) {
      updates.city = body.city.trim();
      criticalChange = true;
    }
    if (typeof body.state === "string" && body.state.trim() !== shop.state) {
      updates.state = body.state.trim();
      criticalChange = true;
    }
    if (
      typeof body.pincode === "string" &&
      body.pincode.trim() !== shop.pincode
    ) {
      updates.pincode = body.pincode.trim();
      criticalChange = true;
    }
    if (typeof body.latitude === "number" && body.latitude !== shop.latitude) {
      updates.latitude = body.latitude;
      criticalChange = true;
    }
    if (
      typeof body.longitude === "number" &&
      body.longitude !== shop.longitude
    ) {
      updates.longitude = body.longitude;
      criticalChange = true;
    }
    if (
      typeof body.gstin === "string" &&
      body.gstin.trim() !== (shop.gstin || "")
    ) {
      updates.gstin = body.gstin.trim().toUpperCase();
      criticalChange = true;
    }

    if (criticalChange && shop.status === "approved") {
      updates.status = "pending_review";
      updates.approvedAt = null;
      updates.manualLive = false; // Turn off live until re-approved

      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        actorId: session.user.id,
        actorRole: "merchant",
        action: "merchant_updated_critical_details",
        entity: "shop",
        entityId: shop.id,
        meta: {
          note: "Critical shop details altered by merchant. Re-verification required.",
        },
      });
    }

    // Apply updates
    await db.update(shops).set(updates).where(eq(shops.id, shop.id));

    // Re-fetch updated shop
    const [updatedShop] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, shop.id))
      .limit(1);

    const hours = await db
      .select()
      .from(shopHours)
      .where(eq(shopHours.shopId, shop.id));

    const [sub] = await db
      .select()
      .from(shopSubscriptions)
      .where(eq(shopSubscriptions.shopId, shop.id))
      .limit(1);

    const isLive = isShopLive(updatedShop, hours, sub || null);

    // If shop just went live from an offline state, notify opted-in customers within range
    if (
      body.manualLive === true &&
      !shop.manualLive &&
      isLive &&
      updatedShop.latitude &&
      updatedShop.longitude
    ) {
      void notifyShopLiveToNearbyCustomers({
        id: updatedShop.id,
        name: updatedShop.name,
        latitude: Number(updatedShop.latitude),
        longitude: Number(updatedShop.longitude),
        locality: updatedShop.locality,
      });
    }

    return NextResponse.json({
      success: true,
      shop: updatedShop,
      isLive,
      criticalChange,
      message: criticalChange
        ? "Shop details updated. Critical changes require re-approval by admin before going live."
        : "Shop updated successfully.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update shop";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
