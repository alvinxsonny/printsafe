import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  printJobs,
  auditLogs,
  notifications,
  documents,
  shops,
  users,
} from "@/lib/db/schema";
import {
  PASSCODE_TTL_MINUTES,
  REQUEST_EXPIRY_MINUTES,
  VIEW_WINDOW_MINUTES,
} from "@/config/app";
import { generatePasscode, encryptPasscode } from "./passcode";
import { deleteObject } from "@/lib/storage/client";
import { processJobRefund } from "@/lib/payments/refund";
import {
  sendJobAcceptedEmail,
  sendJobRejectedEmail,
  sendPushNotification,
} from "@/lib/notify";

export type PrintJobStatus =
  | "requested"
  | "accepted"
  | "awaiting_payment"
  | "paid"
  | "unlocked"
  | "printed"
  | "completed"
  | "rejected"
  | "cancelled"
  | "expired";

export type MachineAction =
  | "accept"
  | "reject"
  | "cancel"
  | "pay"
  | "unlock"
  | "mark_printed"
  | "complete"
  | "regenerate_code"
  | "expire";

export interface ActorInfo {
  id: string;
  role: "customer" | "merchant" | "admin" | "system";
}

/**
 * Checks whether a job has exceeded REQUEST_EXPIRY_MINUTES while unanswered.
 */
export function isJobExpired(job: {
  status: string;
  requestedAt: Date | string;
}): boolean {
  if (job.status !== "requested") return false;
  const requestedTime = new Date(job.requestedAt).getTime();
  const expiryTime = requestedTime + REQUEST_EXPIRY_MINUTES * 60 * 1000;
  return Date.now() > expiryTime;
}

/**
 * Executes a guarded transition on a print job according to Section 7 of plan.md.
 * Automatically writes audit_logs and notifications.
 */
export async function transitionJob(params: {
  jobId: string;
  action: MachineAction;
  actor: ActorInfo;
  reason?: string;
}): Promise<{
  success: boolean;
  newStatus?: PrintJobStatus;
  passcode?: string;
  error?: string;
}> {
  const { jobId, action, actor, reason } = params;

  // 1. Fetch current job
  const [job] = await db
    .select()
    .from(printJobs)
    .where(eq(printJobs.id, jobId))
    .limit(1);

  if (!job) {
    return { success: false, error: "Print job not found." };
  }

  // Check if job expired while in requested state
  if (job.status === "requested" && isJobExpired(job) && action !== "expire") {
    await db
      .update(printJobs)
      .set({ status: "expired" })
      .where(eq(printJobs.id, jobId));
    return { success: false, error: "Print request has expired." };
  }

  const now = new Date();
  let newStatus: PrintJobStatus = job.status;
  let passcode: string | undefined;
  const updates: Partial<typeof printJobs.$inferInsert> = {};

  // 2. State Machine Transitions
  switch (action) {
    case "cancel": {
      const cancellableStatuses = ["requested", "awaiting_payment", "paid"];
      if (!cancellableStatuses.includes(job.status)) {
        return {
          success: false,
          error:
            "Only requested, awaiting payment, or paid (unprinted) jobs can be cancelled.",
        };
      }
      if (actor.role !== "customer" && actor.role !== "admin") {
        return {
          success: false,
          error: "Only the customer or an admin can cancel the job.",
        };
      }
      if (job.status === "paid") {
        await processJobRefund(
          jobId,
          reason || "Job cancelled by customer before printing"
        );
      }
      newStatus = "cancelled";
      updates.status = "cancelled";
      break;
    }

    case "accept": {
      if (job.status !== "requested") {
        return {
          success: false,
          error: `Cannot accept job currently in '${job.status}' status.`,
        };
      }
      if (actor.role !== "merchant" && actor.role !== "admin") {
        return {
          success: false,
          error: "Only the merchant can accept the job.",
        };
      }

      passcode = generatePasscode();
      const codeEnc = encryptPasscode(passcode);
      const codeExpiresAt = new Date(
        now.getTime() + PASSCODE_TTL_MINUTES * 60 * 1000
      );

      if (job.mode === "far") {
        newStatus = "awaiting_payment";
        updates.status = "awaiting_payment";
      } else {
        newStatus = "accepted";
        updates.status = "accepted";
      }

      updates.acceptedAt = now;
      updates.codeEnc = codeEnc;
      updates.codeExpiresAt = codeExpiresAt;
      updates.codeAttempts = 0;
      break;
    }

    case "reject": {
      const rejectableStatuses = ["requested", "awaiting_payment", "paid"];
      if (!rejectableStatuses.includes(job.status)) {
        return {
          success: false,
          error: `Cannot reject job currently in '${job.status}' status.`,
        };
      }
      if (actor.role !== "merchant" && actor.role !== "admin") {
        return {
          success: false,
          error: "Only the merchant can reject the job.",
        };
      }
      if (job.status === "paid") {
        await processJobRefund(
          jobId,
          reason || "Merchant rejected job after payment"
        );
      }
      newStatus = "rejected";
      updates.status = "rejected";
      break;
    }

    case "pay": {
      if (job.status !== "awaiting_payment") {
        return {
          success: false,
          error: `Cannot mark paid for job in '${job.status}' status.`,
        };
      }
      newStatus = "paid";
      updates.status = "paid";
      updates.paidAt = now;
      break;
    }

    case "unlock": {
      if (job.mode === "near" && job.status !== "accepted") {
        return {
          success: false,
          error:
            "Near-mode jobs must be in 'accepted' state with verified code to unlock.",
        };
      }
      if (job.mode === "far" && job.status !== "paid") {
        return {
          success: false,
          error: "Far-mode jobs must be paid before unlocking.",
        };
      }
      newStatus = "unlocked";
      updates.status = "unlocked";
      updates.unlockedUntil = new Date(
        now.getTime() + VIEW_WINDOW_MINUTES * 60 * 1000
      );
      break;
    }

    case "mark_printed": {
      if (job.status !== "unlocked") {
        return {
          success: false,
          error: `Job must be unlocked before marking printed (current: '${job.status}').`,
        };
      }
      newStatus = "printed";
      updates.status = "printed";
      updates.printedAt = now;

      // Check if document has delete_after_print enabled
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, job.documentId))
        .limit(1);

      if (doc && doc.deleteAfterPrint) {
        // Wipe original and rendered pages
        try {
          await deleteObject(doc.storageKey);
          await db
            .update(documents)
            .set({ status: "deleted" })
            .where(eq(documents.id, doc.id));
        } catch (delErr) {
          console.warn("Auto-delete after print failed:", delErr);
        }
      }
      break;
    }

    case "complete": {
      if (job.status !== "printed") {
        return {
          success: false,
          error: `Job must be printed before completion (current: '${job.status}').`,
        };
      }
      newStatus = "completed";
      updates.status = "completed";
      updates.completedAt = now;
      break;
    }

    case "regenerate_code": {
      if (job.status !== "accepted") {
        return {
          success: false,
          error: "Can only regenerate passcode for accepted jobs.",
        };
      }
      passcode = generatePasscode();
      updates.codeEnc = encryptPasscode(passcode);
      updates.codeExpiresAt = new Date(
        now.getTime() + PASSCODE_TTL_MINUTES * 60 * 1000
      );
      updates.codeAttempts = 0;
      break;
    }

    case "expire": {
      const expirableStatuses = ["requested", "awaiting_payment", "paid"];
      if (!expirableStatuses.includes(job.status)) {
        return {
          success: false,
          error: `Cannot expire job in '${job.status}' status.`,
        };
      }
      if (job.status === "paid") {
        await processJobRefund(jobId, "Job expired without being printed");
      }
      newStatus = "expired";
      updates.status = "expired";
      break;
    }

    default:
      return { success: false, error: "Unknown state machine action." };
  }

  // 3. Persist Job Updates
  await db.update(printJobs).set(updates).where(eq(printJobs.id, jobId));

  // 4. Audit Log
  await db.insert(auditLogs).values({
    id: `audit_${crypto.randomUUID()}`,
    actorId: actor.id,
    actorRole: actor.role,
    action: `job_${action}`,
    entity: "print_jobs",
    entityId: jobId,
    meta: {
      previousStatus: job.status,
      newStatus,
      reason: reason || undefined,
    },
    createdAt: now,
  });

  // 5. Emit In-App Notification and Web Push to Opposite Party
  const notifyRecipientId =
    actor.role === "customer" ? job.shopId : job.customerId;

  await db.insert(notifications).values({
    id: `notif_${crypto.randomUUID()}`,
    userId: notifyRecipientId,
    type: `job_status_${newStatus}`,
    payload: {
      jobId,
      status: newStatus,
      message: `Print job status updated to ${newStatus}.`,
    },
    createdAt: now,
  });

  // Web Push to Opposite Party
  void sendPushNotification(notifyRecipientId, {
    title: "PrintSafe Update",
    body: `Print job #${jobId.slice(-6).toUpperCase()} status is now ${newStatus}.`,
    url:
      actor.role === "customer"
        ? `/merchant/jobs/${jobId}`
        : `/app/jobs/${jobId}`,
  });

  // Key Event Transactional Emails (Section 13 Task 2)
  if (action === "accept" || action === "reject") {
    void (async () => {
      try {
        const [customer] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, job.customerId))
          .limit(1);

        const [shop] = await db
          .select({ name: shops.name })
          .from(shops)
          .where(eq(shops.id, job.shopId))
          .limit(1);

        if (customer?.email && shop?.name) {
          if (action === "accept") {
            await sendJobAcceptedEmail({
              to: customer.email,
              shopName: shop.name,
              jobId: job.id,
              mode: job.mode,
              passcode,
            });
          } else if (action === "reject") {
            await sendJobRejectedEmail({
              to: customer.email,
              shopName: shop.name,
              jobId: job.id,
              reason,
            });
          }
        }
      } catch (emailErr) {
        console.warn("Failed to send job transition email:", emailErr);
      }
    })();
  }

  return {
    success: true,
    newStatus,
    passcode,
  };
}
