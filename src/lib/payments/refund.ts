import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payments, auditLogs, notifications } from "@/lib/db/schema";
import { paymentProvider } from "./razorpay";

export interface JobRefundResult {
  refunded: boolean;
  paymentId?: string;
  amountPaise?: number;
  reason?: string;
}

/**
 * Automatically processes a refund for a paid print job if the shop
 * goes offline, rejects the job after payment, or request expires.
 * Writes audit log and customer notification.
 */
export async function processJobRefund(
  jobId: string,
  reason: string
): Promise<JobRefundResult> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.kind, "job"),
        eq(payments.refId, jobId),
        eq(payments.status, "paid")
      )
    )
    .limit(1);

  if (!payment) {
    return {
      refunded: false,
      reason: "No paid transaction found for this job.",
    };
  }

  try {
    if (payment.razorpayPaymentId) {
      await paymentProvider.refund({
        paymentId: payment.razorpayPaymentId,
        amountPaise: payment.amountPaise,
        notes: {
          jobId,
          reason,
        },
      });
    }

    const now = new Date();

    // 1. Mark payment as refunded
    await db
      .update(payments)
      .set({ status: "refunded" })
      .where(eq(payments.id, payment.id));

    // 2. Audit log
    await db.insert(auditLogs).values({
      id: `audit_${crypto.randomUUID()}`,
      actorId: "system",
      actorRole: "system",
      action: "job_refunded",
      entity: "print_jobs",
      entityId: jobId,
      meta: {
        paymentId: payment.id,
        razorpayPaymentId: payment.razorpayPaymentId,
        amountPaise: payment.amountPaise,
        reason,
      },
      createdAt: now,
    });

    // 3. Customer notification
    await db.insert(notifications).values({
      id: `notif_${crypto.randomUUID()}`,
      userId: payment.payerUserId,
      type: "payment_refunded",
      payload: {
        jobId,
        amountPaise: payment.amountPaise,
        reason,
        message: `Your payment of ₹${(payment.amountPaise / 100).toFixed(
          2
        )} has been refunded. Reason: ${reason}`,
      },
      createdAt: now,
    });

    return {
      refunded: true,
      paymentId: payment.id,
      amountPaise: payment.amountPaise,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to process refund";
    console.error(`Refund failed for job ${jobId}:`, errorMsg);
    return {
      refunded: false,
      reason: errorMsg,
    };
  }
}
