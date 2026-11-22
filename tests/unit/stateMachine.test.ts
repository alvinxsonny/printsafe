import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTableName, type Table } from "drizzle-orm";
import { transitionJob, isJobExpired } from "@/lib/jobs/machine";
import { decryptPasscode } from "@/lib/jobs/passcode";

// Mock external side-effect modules
vi.mock("@/lib/storage/client", () => ({
  deleteObject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/payments/refund", () => ({
  processJobRefund: vi
    .fn()
    .mockResolvedValue({ success: true, refundId: "rfnd_test" }),
}));

vi.mock("@/lib/notify", () => ({
  sendJobAcceptedEmail: vi.fn().mockResolvedValue(undefined),
  sendJobRejectedEmail: vi.fn().mockResolvedValue(undefined),
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
}));

// In-memory mock DB state
let mockJobsTable: Record<string, Record<string, unknown>> = {};
let mockDocsTable: Record<string, Record<string, unknown>> = {};
let mockProfilesTable: Record<string, Record<string, unknown>> = {};
let mockAuditLogs: Record<string, unknown>[] = [];
let mockNotifications: Record<string, unknown>[] = [];

function resolveTableName(table: unknown): string {
  try {
    return getTableName(table as Table);
  } catch {
    const fallback = table as { _?: { name?: string }; name?: string };
    return fallback?._?.name || fallback?.name || "";
  }
}

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: unknown) => ({
        where: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockImplementation(async () => {
            const tableName = resolveTableName(table);
            if (tableName === "print_jobs") {
              const jobId = Object.keys(mockJobsTable)[0];
              return jobId && mockJobsTable[jobId]
                ? [mockJobsTable[jobId]]
                : [];
            }
            if (tableName === "documents") {
              const docId = Object.keys(mockDocsTable)[0];
              return docId && mockDocsTable[docId]
                ? [mockDocsTable[docId]]
                : [];
            }
            if (tableName === "customer_profiles") {
              const profId = Object.keys(mockProfilesTable)[0];
              return profId && mockProfilesTable[profId]
                ? [mockProfilesTable[profId]]
                : [];
            }
            return [];
          }),
        })),
      })),
    })),
    update: vi.fn().mockImplementation((table: unknown) => ({
      set: vi.fn().mockImplementation((updates: Record<string, unknown>) => ({
        where: vi.fn().mockImplementation(async () => {
          const tableName = resolveTableName(table);
          if (tableName === "print_jobs") {
            const jobId = Object.keys(mockJobsTable)[0];
            if (jobId && mockJobsTable[jobId]) {
              mockJobsTable[jobId] = { ...mockJobsTable[jobId], ...updates };
            }
          }
          if (tableName === "documents") {
            const docId = Object.keys(mockDocsTable)[0];
            if (docId && mockDocsTable[docId]) {
              mockDocsTable[docId] = { ...mockDocsTable[docId], ...updates };
            }
          }
          if (tableName === "customer_profiles") {
            const profId = Object.keys(mockProfilesTable)[0];
            if (profId && mockProfilesTable[profId]) {
              mockProfilesTable[profId] = {
                ...mockProfilesTable[profId],
                ...updates,
              };
            }
          }
          return { rowCount: 1 };
        }),
      })),
    })),
    insert: vi.fn().mockImplementation((table: unknown) => ({
      values: vi
        .fn()
        .mockImplementation(async (vals: Record<string, unknown>) => {
          const tableName = resolveTableName(table);
          if (tableName === "audit_logs") {
            mockAuditLogs.push(vals);
          } else if (tableName === "notifications") {
            mockNotifications.push(vals);
          } else if (tableName === "customer_profiles") {
            const profileId = String(vals.id || "prof_new");
            mockProfilesTable[profileId] = vals;
          }
          return { rowCount: 1 };
        }),
    })),
  },
}));

describe("Print Job State Machine (Phase 16 QA)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJobsTable = {};
    mockDocsTable = {};
    mockProfilesTable = {};
    mockAuditLogs = [];
    mockNotifications = [];
  });

  describe("isJobExpired helper", () => {
    it("returns false for non-requested status regardless of time", () => {
      const longAgo = new Date(Date.now() - 60 * 60 * 1000);
      expect(isJobExpired({ status: "accepted", requestedAt: longAgo })).toBe(
        false
      );
      expect(isJobExpired({ status: "unlocked", requestedAt: longAgo })).toBe(
        false
      );
      expect(isJobExpired({ status: "completed", requestedAt: longAgo })).toBe(
        false
      );
    });

    it("returns false for newly requested jobs (< 10 minutes)", () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(
        isJobExpired({ status: "requested", requestedAt: fiveMinsAgo })
      ).toBe(false);
    });

    it("returns true for requested jobs older than REQUEST_EXPIRY_MINUTES", () => {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      expect(
        isJobExpired({ status: "requested", requestedAt: fifteenMinsAgo })
      ).toBe(true);
    });
  });

  describe("Action: accept", () => {
    it("transitions near-mode job from requested to accepted and generates 4-digit passcode", async () => {
      const jobId = "job_near_1";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "requested",
        mode: "near",
        customerId: "cust_1",
        shopId: "shop_1",
        documentId: "doc_1",
        sheets: 5,
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "accept",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("accepted");
      expect(result.passcode).toBeDefined();
      expect(result.passcode).toMatch(/^\d{4}$/);

      // Verify DB record update
      expect(mockJobsTable[jobId].status).toBe("accepted");
      expect(mockJobsTable[jobId].codeEnc).toBeDefined();
      expect(decryptPasscode(mockJobsTable[jobId].codeEnc as string)).toBe(
        result.passcode
      );
      expect(mockJobsTable[jobId].codeAttempts).toBe(0);
      expect(mockJobsTable[jobId].codeExpiresAt).toBeInstanceOf(Date);

      // Verify audit log and notification
      expect(mockAuditLogs.some((l) => l.action === "job_accept")).toBe(true);
      expect(
        mockNotifications.some((n) => n.type === "job_status_accepted")
      ).toBe(true);
    });

    it("transitions far-mode job from requested to awaiting_payment", async () => {
      const jobId = "job_far_1";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "requested",
        mode: "far",
        customerId: "cust_1",
        shopId: "shop_1",
        documentId: "doc_1",
        sheets: 10,
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "accept",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("awaiting_payment");
      expect(mockJobsTable[jobId].status).toBe("awaiting_payment");
    });

    it("rejects accept attempt by customer", async () => {
      const jobId = "job_err_1";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "requested",
        mode: "near",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "accept",
        actor: { id: "cust_1", role: "customer" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only the merchant");
      expect(mockJobsTable[jobId].status).toBe("requested");
    });
  });

  describe("Action: pay", () => {
    it("transitions awaiting_payment job to paid and sets paidAt", async () => {
      const jobId = "job_pay_1";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "awaiting_payment",
        mode: "far",
        customerId: "cust_1",
        shopId: "shop_1",
        documentId: "doc_1",
        sheets: 2,
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "pay",
        actor: { id: "system", role: "system" },
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("paid");
      expect(mockJobsTable[jobId].status).toBe("paid");
      expect(mockJobsTable[jobId].paidAt).toBeInstanceOf(Date);
    });

    it("fails when trying to pay a job not in awaiting_payment", async () => {
      const jobId = "job_pay_fail";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "requested",
        mode: "far",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "pay",
        actor: { id: "system", role: "system" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot mark paid");
    });
  });

  describe("Action: unlock", () => {
    it("unlocks near-mode job in accepted status and sets unlockedUntil window", async () => {
      const jobId = "job_unlock_near";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "accepted",
        mode: "near",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "unlock",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("unlocked");
      expect(mockJobsTable[jobId].status).toBe("unlocked");
      expect(mockJobsTable[jobId].unlockedUntil).toBeInstanceOf(Date);
      expect(
        (mockJobsTable[jobId].unlockedUntil as Date).getTime()
      ).toBeGreaterThan(Date.now());
    });

    it("unlocks far-mode job in paid status", async () => {
      const jobId = "job_unlock_far";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "paid",
        mode: "far",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "unlock",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("unlocked");
      expect(mockJobsTable[jobId].status).toBe("unlocked");
    });

    it("blocks unlocking far-mode job if still awaiting_payment", async () => {
      const jobId = "job_unlock_block";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "awaiting_payment",
        mode: "far",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "unlock",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Far-mode jobs must be paid before unlocking"
      );
    });
  });

  describe("Action: mark_printed", () => {
    it("transitions unlocked job to printed and triggers auto-delete if deleteAfterPrint is enabled", async () => {
      const { deleteObject } = await import("@/lib/storage/client");

      const jobId = "job_print_1";
      const docId = "doc_secret_1";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "unlocked",
        mode: "near",
        customerId: "cust_1",
        shopId: "shop_1",
        documentId: docId,
        requestedAt: new Date(),
      };
      mockDocsTable[docId] = {
        id: docId,
        storageKey: "documents/cust_1/secret.pdf",
        deleteAfterPrint: true,
      };

      const result = await transitionJob({
        jobId,
        action: "mark_printed",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("printed");
      expect(mockJobsTable[jobId].status).toBe("printed");
      expect(mockJobsTable[jobId].printedAt).toBeInstanceOf(Date);
      expect(deleteObject).toHaveBeenCalledWith("documents/cust_1/secret.pdf");
      expect(mockDocsTable[docId].status).toBe("deleted");
    });

    it("fails when trying to mark printed from an un-unlocked state", async () => {
      const jobId = "job_print_fail";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "accepted",
        mode: "near",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "mark_printed",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Job must be unlocked before marking printed"
      );
    });
  });

  describe("Action: complete", () => {
    it("transitions printed job to completed and updates customer paper footprint", async () => {
      const jobId = "job_comp_1";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "printed",
        mode: "near",
        customerId: "cust_tree_1",
        shopId: "shop_1",
        sheets: 12,
        requestedAt: new Date(),
      };
      mockProfilesTable["cust_tree_1"] = {
        id: "prof_1",
        userId: "cust_tree_1",
        sheetsPrintedTotal: 25,
      };

      const result = await transitionJob({
        jobId,
        action: "complete",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("completed");
      expect(mockJobsTable[jobId].status).toBe("completed");
      expect(mockJobsTable[jobId].completedAt).toBeInstanceOf(Date);
    });

    it("fails to complete job if not in printed status", async () => {
      const jobId = "job_comp_invalid";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "unlocked",
        mode: "near",
        customerId: "cust_1",
        shopId: "shop_1",
        sheets: 4,
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "complete",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Job must be printed before completion");
    });
  });

  describe("Action: cancel and reject with refund trigger", () => {
    it("cancels paid job and triggers refund process", async () => {
      const { processJobRefund } = await import("@/lib/payments/refund");

      const jobId = "job_cancel_paid";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "paid",
        mode: "far",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "cancel",
        actor: { id: "cust_1", role: "customer" },
        reason: "Customer changed mind",
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("cancelled");
      expect(mockJobsTable[jobId].status).toBe("cancelled");
      expect(processJobRefund).toHaveBeenCalledWith(
        jobId,
        "Customer changed mind"
      );
    });

    it("rejects paid job and triggers refund process", async () => {
      const { processJobRefund } = await import("@/lib/payments/refund");

      const jobId = "job_reject_paid";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "paid",
        mode: "far",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "reject",
        actor: { id: "merch_1", role: "merchant" },
        reason: "Out of paper",
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("rejected");
      expect(mockJobsTable[jobId].status).toBe("rejected");
      expect(processJobRefund).toHaveBeenCalledWith(jobId, "Out of paper");
    });

    it("blocks cancellation of already printed or completed jobs", async () => {
      const jobId = "job_cancel_printed";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "printed",
        mode: "near",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "cancel",
        actor: { id: "cust_1", role: "customer" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Only requested, awaiting payment, or paid"
      );
    });
  });

  describe("Action: regenerate_code", () => {
    it("regenerates passcode for accepted jobs and resets attempts counter", async () => {
      const jobId = "job_regen_1";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "accepted",
        mode: "near",
        customerId: "cust_1",
        shopId: "shop_1",
        codeAttempts: 2,
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "regenerate_code",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(true);
      expect(result.passcode).toMatch(/^\d{4}$/);
      expect(mockJobsTable[jobId].codeAttempts).toBe(0);
      expect(mockJobsTable[jobId].codeEnc).toBeDefined();
    });

    it("regenerates passcode for paid jobs in far mode", async () => {
      const jobId = "job_regen_paid";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "paid",
        mode: "far",
        customerId: "cust_1",
        shopId: "shop_1",
        codeAttempts: 1,
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "regenerate_code",
        actor: { id: "cust_1", role: "customer" },
      });

      expect(result.success).toBe(true);
      expect(result.passcode).toMatch(/^\d{4}$/);
      expect(mockJobsTable[jobId].codeAttempts).toBe(0);
      expect(mockJobsTable[jobId].codeEnc).toBeDefined();
      expect(mockJobsTable[jobId].status).toBe("paid");
    });

    it("blocks regenerate_code if job is neither accepted nor paid", async () => {
      const jobId = "job_regen_fail";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "unlocked",
        mode: "near",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "regenerate_code",
        actor: { id: "merch_1", role: "merchant" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Can only regenerate passcode for accepted or paid jobs"
      );
    });
  });

  describe("Action: expire", () => {
    it("expires requested job", async () => {
      const jobId = "job_expire_req";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "requested",
        mode: "near",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(Date.now() - 20 * 60 * 1000),
      };

      const result = await transitionJob({
        jobId,
        action: "expire",
        actor: { id: "system", role: "system" },
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("expired");
      expect(mockJobsTable[jobId].status).toBe("expired");
    });

    it("expires paid job and triggers refund", async () => {
      const { processJobRefund } = await import("@/lib/payments/refund");

      const jobId = "job_expire_paid";
      mockJobsTable[jobId] = {
        id: jobId,
        status: "paid",
        mode: "far",
        customerId: "cust_1",
        shopId: "shop_1",
        requestedAt: new Date(),
      };

      const result = await transitionJob({
        jobId,
        action: "expire",
        actor: { id: "system", role: "system" },
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("expired");
      expect(processJobRefund).toHaveBeenCalledWith(
        jobId,
        "Job expired without being printed"
      );
    });
  });
});
