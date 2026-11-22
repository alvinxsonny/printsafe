import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  payments,
  webhookEvents,
  shops,
  shopSubscriptions,
  customerProfiles,
  auditLogs,
  printJobs,
} from "@/lib/db/schema";
import { paymentProvider } from "@/lib/payments/razorpay";
import { transitionJob } from "@/lib/jobs/machine";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // 1. Verify Webhook Signature via HMAC SHA-256
    const isValid = paymentProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const eventType = String(payload.event || "");
    const eventId = String(
      payload.event_id ||
        payload.id ||
        req.headers.get("x-razorpay-event-id") ||
        `evt_${crypto.randomUUID()}`
    );

    // 2. Idempotency Check in webhook_events
    const [existingEvent] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, eventId))
      .limit(1);

    if (existingEvent) {
      return NextResponse.json({
        status: "ignored_duplicate",
        eventId,
      });
    }

    const now = new Date();

    // 3. Store event ID in webhook_events for replay defense
    await db.insert(webhookEvents).values({
      eventId,
      type: eventType,
      receivedAt: now,
    });

    const eventPayload = payload.payload as
      | {
          payment?: {
            entity?: { id?: string; order_id?: string; amount?: number };
          };
          order?: { entity?: { id?: string; amount?: number } };
          refund?: {
            entity?: { id?: string; payment_id?: string; amount?: number };
          };
        }
      | undefined;

    // 4. Handle events
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const orderId =
        eventPayload?.payment?.entity?.order_id ||
        eventPayload?.order?.entity?.id;
      const paymentId = eventPayload?.payment?.entity?.id;

      if (orderId) {
        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.razorpayOrderId, orderId))
          .limit(1);

        if (payment && payment.status !== "paid") {
          const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          await db
            .update(payments)
            .set({
              status: "paid",
              razorpayPaymentId: paymentId || payment.razorpayPaymentId,
            })
            .where(eq(payments.id, payment.id));

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
            }
          } else if (payment.kind === "customer_plan") {
            const [profile] = await db
              .select()
              .from(customerProfiles)
              .where(eq(customerProfiles.userId, payment.payerUserId))
              .limit(1);

            if (profile) {
              await db
                .update(customerProfiles)
                .set({
                  planId: payment.refId,
                  planPeriodEnd: periodEnd,
                })
                .where(eq(customerProfiles.id, profile.id));
            } else {
              await db.insert(customerProfiles).values({
                id: `cust_${crypto.randomUUID()}`,
                userId: payment.payerUserId,
                planId: payment.refId,
                planPeriodEnd: periodEnd,
              });
            }
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
                actor: { id: "system", role: "system" },
              });
            }
          }
        }
      }
    } else if (eventType === "payment.failed") {
      const orderId = eventPayload?.payment?.entity?.order_id;
      if (orderId) {
        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.razorpayOrderId, orderId))
          .limit(1);

        if (payment && payment.status !== "paid") {
          await db
            .update(payments)
            .set({ status: "failed" })
            .where(eq(payments.id, payment.id));

          await db.insert(auditLogs).values({
            id: `audit_${crypto.randomUUID()}`,
            actorId: "system",
            actorRole: "system",
            action: "payment_failed",
            entity: "payments",
            entityId: payment.id,
            meta: { eventId, orderId },
            createdAt: now,
          });
        }
      }
    } else if (eventType === "refund.processed") {
      const paymentId = eventPayload?.refund?.entity?.payment_id;
      if (paymentId) {
        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.razorpayPaymentId, paymentId))
          .limit(1);

        if (payment) {
          await db
            .update(payments)
            .set({ status: "refunded" })
            .where(eq(payments.id, payment.id));

          await db.insert(auditLogs).values({
            id: `audit_${crypto.randomUUID()}`,
            actorId: "system",
            actorRole: "system",
            action: "payment_refund_processed",
            entity: "payments",
            entityId: payment.id,
            meta: { eventId, paymentId },
            createdAt: now,
          });
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Webhook processing failed";
    console.error("Webhook processing error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
