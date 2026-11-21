import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import {
  shops,
  shopReviews,
  shopSubscriptions,
  plans,
  auditLogs,
  notifications,
  users,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/notify/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const { id: shopId } = await params;
    const body = await req.json();
    const { decision, checklist, notes } = body;

    const validDecisions = [
      "approved",
      "changes_requested",
      "rejected",
      "suspended",
      "reinstated",
    ];

    if (!validDecisions.includes(decision)) {
      return NextResponse.json(
        { error: `Invalid decision: ${decision}` },
        { status: 400 }
      );
    }

    // Notes are required for any decision other than approve
    if (decision !== "approved" && (!notes || !notes.trim())) {
      return NextResponse.json(
        {
          error:
            "Admin notes are mandatory for decisions requiring changes, rejection, or suspension.",
        },
        { status: 400 }
      );
    }

    // Fetch the shop
    const shopRows = await db
      .select()
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    if (shopRows.length === 0) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    const shop = shopRows[0];

    // Acceptance rule: A merchant cannot approve themselves
    if (shop.ownerId === session.user.id) {
      return NextResponse.json(
        { error: "Admins cannot review or approve their own shop." },
        { status: 403 }
      );
    }

    // 1. Record shop_reviews entry
    await db.insert(shopReviews).values({
      id: crypto.randomUUID(),
      shopId,
      adminId: session.user.id,
      decision,
      checklist: checklist || null,
      notes: notes ? notes.trim() : null,
    });

    // 2. Process shop status transition
    const now = new Date();

    if (decision === "approved") {
      await db
        .update(shops)
        .set({
          status: "approved",
          approvedAt: now,
        })
        .where(eq(shops.id, shopId));

      // Create or update 30-day Growth trial subscription
      const growthPlans = await db
        .select()
        .from(plans)
        .where(eq(plans.code, "merchant_growth"))
        .limit(1);

      if (growthPlans.length > 0) {
        const plan = growthPlans[0];
        const periodStart = now;
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const existingSub = await db
          .select()
          .from(shopSubscriptions)
          .where(eq(shopSubscriptions.shopId, shopId))
          .limit(1);

        if (existingSub.length > 0) {
          await db
            .update(shopSubscriptions)
            .set({
              planId: plan.id,
              status: "trial",
              periodStart,
              periodEnd,
            })
            .where(eq(shopSubscriptions.id, existingSub[0].id));
        } else {
          await db.insert(shopSubscriptions).values({
            id: crypto.randomUUID(),
            shopId,
            planId: plan.id,
            status: "trial",
            periodStart,
            periodEnd,
          });
        }
      }
    } else if (decision === "changes_requested") {
      await db
        .update(shops)
        .set({ status: "changes_requested" })
        .where(eq(shops.id, shopId));
    } else if (decision === "rejected") {
      await db
        .update(shops)
        .set({ status: "rejected" })
        .where(eq(shops.id, shopId));
    } else if (decision === "suspended") {
      // Force shop offline immediately
      await db
        .update(shops)
        .set({
          status: "suspended",
          manualLive: false,
        })
        .where(eq(shops.id, shopId));
    } else if (decision === "reinstated") {
      await db
        .update(shops)
        .set({ status: "approved" })
        .where(eq(shops.id, shopId));
    }

    // 3. Record Audit Log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorId: session.user.id,
      actorRole: "admin",
      action: `shop.${decision}`,
      entity: "shop",
      entityId: shopId,
      meta: {
        shopName: shop.name,
        decision,
        checklist,
        notes: notes ? notes.trim() : null,
      },
    });

    // 4. Notify merchant
    const ownerRows = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, shop.ownerId))
      .limit(1);

    if (ownerRows.length > 0) {
      const owner = ownerRows[0];

      // In-app notification
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: owner.id,
        type: `merchant.shop_${decision}`,
        payload: {
          shopId,
          shopName: shop.name,
          decision,
          notes: notes ? notes.trim() : null,
          updatedAt: now.toISOString(),
        },
      });

      // Email notification
      try {
        let emailSubject = `PrintSafe: Verification Update for ${shop.name}`;
        let statusBadgeColor = "#3DD68C";
        let statusText = "Approved";

        if (decision === "approved") {
          emailSubject = `🎉 PrintSafe: Your Shop "${shop.name}" is Approved!`;
        } else if (decision === "changes_requested") {
          statusBadgeColor = "#FFB84D";
          statusText = "Changes Requested";
          emailSubject = `Action Required: PrintSafe Shop Review for ${shop.name}`;
        } else if (decision === "suspended") {
          statusBadgeColor = "#FF6B6B";
          statusText = "Suspended";
          emailSubject = `Notice: PrintSafe Shop Suspended - ${shop.name}`;
        } else if (decision === "rejected") {
          statusBadgeColor = "#FF6B6B";
          statusText = "Rejected";
          emailSubject = `PrintSafe Application Decision: ${shop.name}`;
        }

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 32px 16px; background-color: #F5F2EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #FBF9F3; border: 1px solid #DED7C6; border-radius: 20px; padding: 28px; box-shadow: 0 4px 16px rgba(20, 33, 61, 0.08);">
    <div style="display: inline-block; padding: 4px 12px; background-color: ${statusBadgeColor}; color: #14213D; font-weight: 700; font-size: 12px; border-radius: 9999px; margin-bottom: 16px;">
      ${statusText}
    </div>
    <h1 style="color: #14213D; font-size: 22px; font-weight: 800; margin: 0 0 12px 0;">
      Storefront Review Decision: ${shop.name}
    </h1>
    <p style="color: #4A5568; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
      ${
        decision === "approved"
          ? "Congratulations! Your storefront has been verified. Your 30-day Growth trial is now active, and you can switch your shop to <strong>LIVE</strong> on the merchant dashboard to start accepting orders."
          : decision === "changes_requested"
            ? "Our verification team reviewed your storefront submission and requested modifications before your shop can go live."
            : decision === "suspended"
              ? "Your shop has been suspended by an administrator and forced offline. Please contact support or review the administrative notes below."
              : "Your storefront registration could not be approved at this time."
      }
    </p>

    ${
      notes
        ? `<div style="background-color: #EAE4D4; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #14213D;">
            <strong>Admin Notes:</strong>
            <p style="margin: 6px 0 0 0; white-space: pre-wrap;">${notes}</p>
          </div>`
        : ""
    }

    <p style="color: #4A5568; font-size: 13px; margin: 0 0 16px 0;">
      Log in to your merchant dashboard to view the latest status and manage your shop.
    </p>
    <hr style="border: none; border-top: 1px solid #DED7C6; margin: 20px 0;" />
    <p style="color: #718096; font-size: 12px; margin: 0;">
      PrintSafe Zero-Trust Printing Network &bull; Merchant Operations
    </p>
  </div>
</body>
</html>`;

        await sendEmail({
          to: owner.email,
          subject: emailSubject,
          html,
        });
      } catch (emailErr) {
        console.warn("Failed to send merchant decision email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      decision,
      shopId,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to record decision";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
