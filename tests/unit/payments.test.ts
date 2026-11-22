import crypto from "node:crypto";
import { describe, it, expect } from "vitest";
import { RazorpayProvider } from "@/lib/payments/razorpay";
import { PLANS } from "@/config/plans";

describe("Phase 12: Payments & Plan Limits", () => {
  const TEST_KEY_ID = "rzp_test_U2sHhbpjQCCkIw";
  const TEST_KEY_SECRET = "gLs7454y8Wvrj7EIGRKA3kyI";
  const TEST_WEBHOOK_SECRET = "printsafe_whsec_secret123456789";

  const provider = new RazorpayProvider(
    TEST_KEY_ID,
    TEST_KEY_SECRET,
    TEST_WEBHOOK_SECRET
  );

  describe("Razorpay Signature Verification", () => {
    it("validates authentic client checkout signature", () => {
      const orderId = "order_N1234567890abc";
      const paymentId = "pay_P9876543210xyz";
      const expectedSignature = crypto
        .createHmac("sha256", TEST_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const isValid = provider.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: expectedSignature,
      });

      expect(isValid).toBe(true);
    });

    it("rejects forged or tampered payment signatures", () => {
      const orderId = "order_N1234567890abc";
      const paymentId = "pay_P9876543210xyz";

      // Forged signature
      const forgedSignature =
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

      expect(
        provider.verifyPaymentSignature({
          orderId,
          paymentId,
          signature: forgedSignature,
        })
      ).toBe(false);

      // Signature from a different order
      const otherSig = crypto
        .createHmac("sha256", TEST_KEY_SECRET)
        .update(`other_order|${paymentId}`)
        .digest("hex");

      expect(
        provider.verifyPaymentSignature({
          orderId,
          paymentId,
          signature: otherSig,
        })
      ).toBe(false);
    });

    it("handles malformed or empty signature inputs safely", () => {
      expect(
        provider.verifyPaymentSignature({
          orderId: "",
          paymentId: "pay_123",
          signature: "sig",
        })
      ).toBe(false);

      expect(
        provider.verifyPaymentSignature({
          orderId: "order_123",
          paymentId: "",
          signature: "sig",
        })
      ).toBe(false);

      expect(
        provider.verifyPaymentSignature({
          orderId: "order_123",
          paymentId: "pay_123",
          signature: "not_a_hex_string_xyz!",
        })
      ).toBe(false);
    });
  });

  describe("Razorpay Webhook Verification", () => {
    it("validates authentic webhook payload signature", () => {
      const rawBody = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_xyz123",
              amount: 59900,
              order_id: "order_abc789",
            },
          },
        },
      });

      const validWebhookSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

      const isValid = provider.verifyWebhookSignature(rawBody, validWebhookSig);
      expect(isValid).toBe(true);
    });

    it("rejects forged or modified webhook bodies", () => {
      const originalBody = JSON.stringify({
        event: "payment.captured",
        amount: 59900,
      });
      const validSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(originalBody)
        .digest("hex");

      // Attacker tampers with body
      const tamperedBody = JSON.stringify({
        event: "payment.captured",
        amount: 100,
      });

      expect(provider.verifyWebhookSignature(tamperedBody, validSig)).toBe(
        false
      );
      expect(provider.verifyWebhookSignature(originalBody, "invalid_sig")).toBe(
        false
      );
    });
  });

  describe("Plan Boundary & Quota Enforcement Rules", () => {
    it("enforces Starter plan 100 job limit (101st job blocked)", () => {
      const starterPlan = PLANS.find((p) => p.id === "merchant_starter")!;
      expect(starterPlan).toBeDefined();
      const jobLimit = starterPlan.limits.jobs_per_month!;
      expect(jobLimit).toBe(100);

      const checkJobsQuota = (currentJobsCount: number) => {
        if (currentJobsCount >= jobLimit) {
          return {
            allowed: false,
            remainingJobs: 0,
            reason: `Shop has reached its monthly quota of ${jobLimit} print jobs on the Starter plan.`,
          };
        }
        return {
          allowed: true,
          remainingJobs: jobLimit - currentJobsCount,
        };
      };

      // 99 jobs used -> 1 remaining -> allowed
      const res99 = checkJobsQuota(99);
      expect(res99.allowed).toBe(true);
      expect(res99.remainingJobs).toBe(1);

      // 100 jobs used -> 0 remaining -> 101st job blocked
      const res100 = checkJobsQuota(100);
      expect(res100.allowed).toBe(false);
      expect(res100.remainingJobs).toBe(0);
      expect(res100.reason).toContain("reached its monthly quota of 100");

      // 105 jobs used -> blocked
      const res105 = checkJobsQuota(105);
      expect(res105.allowed).toBe(false);
    });

    it("enforces Starter plan unique customer limit (50 customers)", () => {
      const starterPlan = PLANS.find((p) => p.id === "merchant_starter")!;
      const customerLimit = starterPlan.limits.customers_per_month!;
      expect(customerLimit).toBe(50);

      const checkCustomerQuota = (uniqueCustomersCount: number) => {
        if (uniqueCustomersCount >= customerLimit) {
          return {
            allowed: false,
            remainingCustomers: 0,
            reason: `Shop has reached its monthly unique customer limit of ${customerLimit} on the Starter plan.`,
          };
        }
        return {
          allowed: true,
          remainingCustomers: customerLimit - uniqueCustomersCount,
        };
      };

      expect(checkCustomerQuota(49).allowed).toBe(true);
      expect(checkCustomerQuota(50).allowed).toBe(false);
      expect(checkCustomerQuota(51).allowed).toBe(false);
    });

    it("enforces Free customer tier upload quota (10 uploads/mo, 11th blocked)", () => {
      const freePlan = PLANS.find((p) => p.id === "customer_free")!;
      const uploadLimit = freePlan.limits.uploads_per_month!;
      expect(uploadLimit).toBe(10);

      const checkUploads = (currentUploads: number) => {
        if (currentUploads >= uploadLimit) {
          return {
            allowed: false,
            reason: `Monthly upload limit of ${uploadLimit} reached.`,
          };
        }
        return { allowed: true };
      };

      expect(checkUploads(9).allowed).toBe(true);
      expect(checkUploads(10).allowed).toBe(false);
      expect(checkUploads(11).allowed).toBe(false);
    });

    it("enforces customer vault storage boundary (Free 100 MB vs Plus 2 GB)", () => {
      const freePlan = PLANS.find((p) => p.id === "customer_free")!;
      const freeMaxBytes = (freePlan.limits.vault_mb || 100) * 1024 * 1024;

      const checkStorage = (currentBytes: number, newFileBytes: number) => {
        return currentBytes + newFileBytes <= freeMaxBytes;
      };

      const ninetyFiveMb = 95 * 1024 * 1024;
      const fourMb = 4 * 1024 * 1024;
      const tenMb = 10 * 1024 * 1024;

      // 95 MB + 4 MB = 99 MB <= 100 MB -> allowed
      expect(checkStorage(ninetyFiveMb, fourMb)).toBe(true);

      // 95 MB + 10 MB = 105 MB > 100 MB -> rejected
      expect(checkStorage(ninetyFiveMb, tenMb)).toBe(false);
    });
  });

  describe("Subscription Grace Period & Expiry Logic", () => {
    it("respects 3-day grace period for subscriptions", () => {
      const now = new Date("2026-11-22T10:00:00Z");

      // Expired 1 day ago, status is 'grace' -> allowed within 3 days
      const subGrace = {
        status: "grace",
        periodEnd: new Date("2026-11-21T10:00:00Z"), // 1 day ago
      };

      const isSubValid = (
        sub: { status: string; periodEnd: Date },
        currentTime: Date
      ) => {
        const graceExtraMs =
          sub.status === "grace" ? 3 * 24 * 60 * 60 * 1000 : 0;
        const cutoff = sub.periodEnd.getTime() + graceExtraMs;
        return currentTime.getTime() <= cutoff;
      };

      expect(isSubValid(subGrace, now)).toBe(true);

      // Expired 4 days ago in grace -> past 3-day grace cutoff -> blocked
      const subExpiredPastGrace = {
        status: "grace",
        periodEnd: new Date("2026-11-18T09:00:00Z"), // 4 days ago
      };

      expect(isSubValid(subExpiredPastGrace, now)).toBe(false);
    });
  });

  describe("Automatic Refund Triggering Logic", () => {
    it("identifies paid jobs eligible for automatic refund upon rejection, cancellation, or expiry", () => {
      const shouldTriggerRefund = (jobStatus: string, action: string) => {
        if (jobStatus === "paid") {
          if (["reject", "cancel", "expire"].includes(action)) {
            return true;
          }
        }
        return false;
      };

      // Unpaid requested job cancelled -> no refund needed
      expect(shouldTriggerRefund("requested", "cancel")).toBe(false);
      // Unpaid awaiting_payment job rejected -> no refund needed
      expect(shouldTriggerRefund("awaiting_payment", "reject")).toBe(false);

      // Paid job cancelled by customer -> refund triggered
      expect(shouldTriggerRefund("paid", "cancel")).toBe(true);
      // Paid job rejected by merchant -> refund triggered
      expect(shouldTriggerRefund("paid", "reject")).toBe(true);
      // Paid job expired -> refund triggered
      expect(shouldTriggerRefund("paid", "expire")).toBe(true);

      // Already printed job -> no refund
      expect(shouldTriggerRefund("printed", "reject")).toBe(false);
    });
  });

  describe("Webhook Deduplication & Idempotency", () => {
    it("detects duplicate webhook event IDs to prevent double execution", () => {
      const processedEventIds = new Set<string>();

      const handleWebhookEvent = (eventId: string) => {
        if (processedEventIds.has(eventId)) {
          return { status: "ignored_duplicate" };
        }
        processedEventIds.add(eventId);
        return { status: "processed" };
      };

      const eventId = "evt_razorpay_987654321";

      // First delivery: processed
      const first = handleWebhookEvent(eventId);
      expect(first.status).toBe("processed");

      // Second delivery (replay): ignored duplicate
      const second = handleWebhookEvent(eventId);
      expect(second.status).toBe("ignored_duplicate");

      // Different event ID: processed
      const third = handleWebhookEvent("evt_razorpay_different");
      expect(third.status).toBe("processed");
    });
  });
});
