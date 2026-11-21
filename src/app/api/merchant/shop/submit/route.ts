import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import {
  shops,
  shopHours,
  auditLogs,
  notifications,
  users,
} from "@/lib/db/schema";
import { checkShopDuplicates } from "@/lib/shops/duplicate";
import { sendEmail } from "@/lib/notify/email";
import { env } from "@/lib/env";

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
    const {
      id: providedShopId,
      name,
      addressLine,
      locality,
      city,
      state,
      pincode,
      latitude,
      longitude,
      googleMapsUrl,
      googleFtid,
      extraction,
      services,
      priceBwPaise,
      priceColorPaise,
      contactPhone,
      showPhone,
      gstin,
      storefrontPhotoKey,
      scheduleEnabled,
      hours,
      confirmProximity,
    } = body;

    // 1. Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Shop name is required." },
        { status: 400 }
      );
    }
    if (
      !addressLine ||
      typeof addressLine !== "string" ||
      !addressLine.trim()
    ) {
      return NextResponse.json(
        { error: "Address line is required." },
        { status: 400 }
      );
    }
    if (!city || !state || !pincode) {
      return NextResponse.json(
        { error: "City, State, and Pincode are required." },
        { status: 400 }
      );
    }
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return NextResponse.json(
        { error: "Valid map coordinates are required." },
        { status: 400 }
      );
    }
    if (
      !contactPhone ||
      typeof contactPhone !== "string" ||
      !contactPhone.trim()
    ) {
      return NextResponse.json(
        { error: "Shop contact phone is required for verification." },
        { status: 400 }
      );
    }
    if (
      !priceBwPaise ||
      priceBwPaise <= 0 ||
      !priceColorPaise ||
      priceColorPaise <= 0
    ) {
      return NextResponse.json(
        { error: "Valid print prices are required." },
        { status: 400 }
      );
    }

    // 2. Fetch existing shop for merchant
    const existing = await db
      .select()
      .from(shops)
      .where(eq(shops.ownerId, session.user.id))
      .limit(1);

    const shopId =
      existing.length > 0
        ? existing[0].id
        : providedShopId || crypto.randomUUID();

    // 3. Duplicate and Proximity Guard
    const dupCheck = await checkShopDuplicates(
      existing.length > 0 ? shopId : null,
      googleFtid,
      latitude,
      longitude
    );

    if (dupCheck.isDuplicate) {
      return NextResponse.json(
        { error: dupCheck.duplicateReason },
        { status: 409 }
      );
    }

    if (dupCheck.proximityWarning && !confirmProximity) {
      return NextResponse.json(
        {
          proximityWarning: true,
          message: `Another shop ("${dupCheck.nearbyShopName}") is registered ${dupCheck.nearbyDistanceM}m away. Please confirm this is your unique storefront to proceed.`,
        },
        { status: 409 }
      );
    }

    // 4. Upsert shop with status = 'pending_review'
    const shopData = {
      name: name.trim(),
      addressLine: addressLine.trim(),
      locality: locality ? locality.trim() : null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      latitude,
      longitude,
      googleMapsUrl: googleMapsUrl || null,
      googleFtid: googleFtid || null,
      extraction: extraction || null,
      services: services || { bw: true, color: true, a3: false, duplex: true },
      priceBwPaise: Math.round(priceBwPaise),
      priceColorPaise: Math.round(priceColorPaise),
      contactPhone: contactPhone.trim(),
      showPhone: Boolean(showPhone),
      gstin: gstin ? gstin.trim() : null,
      storefrontPhotoKey: storefrontPhotoKey || null,
      scheduleEnabled: Boolean(scheduleEnabled),
      status: "pending_review" as const,
    };

    if (existing.length > 0) {
      await db.update(shops).set(shopData).where(eq(shops.id, shopId));
    } else {
      await db.insert(shops).values({
        id: shopId,
        ownerId: session.user.id,
        ...shopData,
      });
    }

    // 5. Sync shop hours
    if (Array.isArray(hours)) {
      await db.delete(shopHours).where(eq(shopHours.shopId, shopId));
      if (hours.length > 0) {
        await db.insert(shopHours).values(
          hours.map(
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

    // 6. Record Audit Log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorId: session.user.id,
      actorRole: "merchant",
      action: "shop.submitted",
      entity: "shop",
      entityId: shopId,
      meta: {
        name: shopData.name,
        addressLine: shopData.addressLine,
        city: shopData.city,
        googleFtid: shopData.googleFtid,
        contactPhone: shopData.contactPhone,
      },
    });

    // 7. Send receipt email to the merchant
    try {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 32px 16px; background-color: #F5F2EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #FBF9F3; border: 1px solid #DED7C6; border-radius: 20px; padding: 28px; box-shadow: 0 4px 16px rgba(20, 33, 61, 0.08);">
    <div style="display: inline-block; padding: 4px 12px; background-color: #3DD68C; color: #14213D; font-weight: 700; font-size: 12px; border-radius: 9999px; margin-bottom: 16px;">
      PrintSafe Merchant Verification
    </div>
    <h1 style="color: #14213D; font-size: 22px; font-weight: 800; margin: 0 0 12px 0;">
      Application Received
    </h1>
    <p style="color: #4A5568; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
      Thank you for submitting your shop <strong>${shopData.name}</strong> for verification on PrintSafe.
    </p>
    <div style="background-color: #EAE4D4; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #14213D;">
      <p style="margin: 0 0 6px 0;"><strong>Address:</strong> ${shopData.addressLine}, ${shopData.city}, ${shopData.state} - ${shopData.pincode}</p>
      <p style="margin: 0 0 6px 0;"><strong>B&W Rate:</strong> ₹${(shopData.priceBwPaise / 100).toFixed(2)}/page</p>
      <p style="margin: 0;"><strong>Colour Rate:</strong> ₹${(shopData.priceColorPaise / 100).toFixed(2)}/page</p>
    </div>
    <p style="color: #4A5568; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
      Our admin team typically verifies storefront details within 24 hours. You will receive an email as soon as your account is approved and ready to accept live print requests.
    </p>
    <hr style="border: none; border-top: 1px solid #DED7C6; margin: 20px 0;" />
    <p style="color: #718096; font-size: 12px; margin: 0;">
      PrintSafe Zero-Trust Printing Network. Keep your customer documents secure.
    </p>
  </div>
</body>
</html>`;

      await sendEmail({
        to: session.user.email,
        subject: `PrintSafe: Application Received for ${shopData.name}`,
        html: emailHtml,
      });
    } catch (emailErr) {
      console.warn("Failed to send merchant receipt email:", emailErr);
    }

    // 8. Notify Admins
    try {
      const adminEmailList = env.ADMIN_EMAILS.split(",").map((e) =>
        e.trim().toLowerCase()
      );
      const adminUsers = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(inArray(users.email, adminEmailList));

      if (adminUsers.length > 0) {
        await db.insert(notifications).values(
          adminUsers.map((admin) => ({
            id: crypto.randomUUID(),
            userId: admin.id,
            type: "admin.shop_submission",
            payload: {
              shopId,
              shopName: shopData.name,
              merchantEmail: session.user.email,
              submittedAt: new Date().toISOString(),
            },
          }))
        );
      }
    } catch (notifErr) {
      console.warn("Failed to notify admins:", notifErr);
    }

    return NextResponse.json({ success: true, shopId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit shop";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
