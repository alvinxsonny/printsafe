import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import {
  payments,
  shops,
  shopSubscriptions,
  customerProfiles,
  auditLogs,
  notifications,
  printJobs,
} from "@/lib/db/schema";
import { paymentProvider } from "@/lib/payments/razorpay";
import { transitionJob } from "@/lib/jobs/machine";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, paymentId, signature } = body;

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: "orderId, paymentId, and signature are required." },
        { status: 400 }
      );
    }

    // 1. Constant-time HMAC SHA-256 verification
    const isValidSignature = paymentProvider.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid payment signature. Verification failed." },
        { status: 400 }
      );
    }

    // 2. Fetch payment row
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, orderId))
      .limit(1);

    if (!payment) {
      return NextResponse.json(
        { error: "Payment transaction not found for this order." },
        { status: 404 }
      );
    }

    // Idempotency: if already marked paid, return success
    if (payment.status === "paid") {
      return NextResponse.json({
        success: true,
        status: "paid",
        alreadyProcessed: true,
        paymentRecordId: payment.id,
      });
    }

    const now = new Date();
    const periodDays = 30;
    const periodEnd = new Date(
      now.getTime() + periodDays * 24 * 60 * 60 * 1000
    );

    // 3. Mark payment as paid
    await db
      .update(payments)
      .set({
        status: "paid",
        razorpayPaymentId: paymentId,
      })
      .where(eq(payments.id, payment.id));

    // 4. Handle activation by kind
    if (payment.kind === "merchant_plan") {
      const [shop] = await db
        .select()
        .from(shops)
        .where(eq(shops.ownerId, payment.payerUserId))
        .limit(1);

      if (shop) {
        const [existingSub] = await db
          .select()
          .from(shopSubscriptions)
          .where(eq(shopSubscriptions.shopId, shop.id))
          .limit(1);

        if (existingSub) {
          await db
            .update(shopSubscriptions)
            .set({
              planId: payment.refId,
              status: "active",
              periodStart: now,
              periodEnd,
              paymentId: payment.id,
            })
            .where(eq(shopSubscriptions.id, existingSub.id));
        } else {
          await db.insert(shopSubscriptions).values({
            id: `sub_${crypto.randomUUID()}`,
            shopId: shop.id,
            planId: payment.refId,
            status: "active",
            periodStart: now,
            periodEnd,
            paymentId: payment.id,
          });
        }

        await db.insert(auditLogs).values({
          id: `audit_${crypto.randomUUID()}`,
          actorId: session.user.id,
          actorRole: session.user.role,
          action: "merchant_subscription_activated",
          entity: "shop_subscriptions",
          entityId: shop.id,
          meta: {
            planId: payment.refId,
            amountPaise: payment.amountPaise,
            periodEnd,
          },
          createdAt: now,
        });

        await db.insert(notifications).values({
          id: `notif_${crypto.randomUUID()}`,
          userId: payment.payerUserId,
          type: "subscription_activated",
          payload: {
            shopId: shop.id,
            planId: payment.refId,
            periodEnd,
            message: "Your merchant subscription is now active for 30 days.",
          },
          createdAt: now,
        });
      }
    } else if (payment.kind === "customer_plan") {
      const [existingProfile] = await db
        .select()
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, payment.payerUserId))
        .limit(1);

      if (existingProfile) {
        await db
          .update(customerProfiles)
          .set({
            planId: payment.refId,
            planPeriodEnd: periodEnd,
          })
          .where(eq(customerProfiles.id, existingProfile.id));
      } else {
        await db.insert(customerProfiles).values({
          id: `cust_${crypto.randomUUID()}`,
          userId: payment.payerUserId,
          planId: payment.refId,
          planPeriodEnd: periodEnd,
        });
      }

      await db.insert(auditLogs).values({
        id: `audit_${crypto.randomUUID()}`,
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "customer_subscription_activated",
        entity: "customer_profiles",
        entityId: payment.payerUserId,
        meta: {
          planId: payment.refId,
          amountPaise: payment.amountPaise,
          periodEnd,
        },
        createdAt: now,
      });

      await db.insert(notifications).values({
        id: `notif_${crypto.randomUUID()}`,
        userId: payment.payerUserId,
        type: "plan_upgraded",
        payload: {
          planId: payment.refId,
          periodEnd,
          message: "Your Plus plan upgrade is now active for 30 days.",
        },
        createdAt: now,
      });
    } else if (payment.kind === "job") {
      const [job] = await db
        .select()
        .from(printJobs)
        .where(eq(printJobs.id, payment.refId))
        .limit(1);

      if (job && job.status === "awaiting_payment") {
        await transitionJob({
          jobId: job.id,
          action: "pay",
          actor: {
            id: session.user.id,
            role: session.user.role as "customer" | "merchant" | "admin",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      status: "paid",
      paymentRecordId: payment.id,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Payment verification failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
