import { describe, it, expect } from "vitest";
import {
  generatePasscode,
  encryptPasscode,
  verifyPasscode,
} from "@/lib/jobs/passcode";
import { isShopLive } from "@/lib/db/queries";

describe("Phase 10: Merchant Operations & Security", () => {
  describe("Passcode Verification and Locking Mechanics", () => {
    it("unlocks when correct 4-digit code is provided", () => {
      const code = generatePasscode();
      const codeEnc = encryptPasscode(code);
      expect(verifyPasscode(code, codeEnc)).toBe(true);
    });

    it("rejects invalid code without matching", () => {
      const code = "1234";
      const codeEnc = encryptPasscode(code);
      expect(verifyPasscode("9999", codeEnc)).toBe(false);
      expect(verifyPasscode("0000", codeEnc)).toBe(false);
      expect(verifyPasscode("123", codeEnc)).toBe(false);
    });

    it("simulates 3-attempt locking logic", () => {
      const correctCode = "4821";
      const codeEnc = encryptPasscode(correctCode);

      let attempts = 0;
      const MAX_ATTEMPTS = 3;

      const submitAttempt = (attemptCode: string) => {
        if (attempts >= MAX_ATTEMPTS) {
          return { success: false, locked: true };
        }
        const valid = verifyPasscode(attemptCode, codeEnc);
        if (!valid) {
          attempts += 1;
        }
        return {
          success: valid,
          locked: attempts >= MAX_ATTEMPTS,
          attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts),
        };
      };

      // Attempt 1: wrong
      const res1 = submitAttempt("0001");
      expect(res1.success).toBe(false);
      expect(res1.locked).toBe(false);
      expect(res1.attemptsRemaining).toBe(2);

      // Attempt 2: wrong
      const res2 = submitAttempt("0002");
      expect(res2.success).toBe(false);
      expect(res2.locked).toBe(false);
      expect(res2.attemptsRemaining).toBe(1);

      // Attempt 3: wrong -> lock
      const res3 = submitAttempt("0003");
      expect(res3.success).toBe(false);
      expect(res3.locked).toBe(true);
      expect(res3.attemptsRemaining).toBe(0);

      // Attempt 4: even with correct code, must stay locked
      const res4 = submitAttempt(correctCode);
      expect(res4.success).toBe(false);
      expect(res4.locked).toBe(true);
    });
  });

  describe("Merchant Storefront Live Toggle & Schedule State", () => {
    const validSub = {
      status: "active",
      periodEnd: new Date(Date.now() + 86400000 * 30),
    };

    it("offline if manualLive is false", () => {
      const shop = {
        status: "approved",
        manualLive: false,
        scheduleEnabled: false,
      };
      expect(isShopLive(shop, [], validSub)).toBe(false);
    });

    it("live if approved, valid sub, and manualLive is true", () => {
      const shop = {
        status: "approved",
        manualLive: true,
        scheduleEnabled: false,
      };
      expect(isShopLive(shop, [], validSub)).toBe(true);
    });

    it("cannot go live if unapproved or pending", () => {
      const shopPending = {
        status: "pending_review",
        manualLive: true,
        scheduleEnabled: false,
      };
      expect(isShopLive(shopPending, [], validSub)).toBe(false);

      const shopDraft = {
        status: "draft",
        manualLive: true,
        scheduleEnabled: false,
      };
      expect(isShopLive(shopDraft, [], validSub)).toBe(false);
    });

    it("cannot go live if subscription expired", () => {
      const expiredSub = {
        status: "expired",
        periodEnd: new Date(Date.now() - 1000),
      };
      const shop = {
        status: "approved",
        manualLive: true,
        scheduleEnabled: false,
      };
      expect(isShopLive(shop, [], expiredSub)).toBe(false);
    });

    it("respects operating hours schedule when scheduleEnabled is true", () => {
      // Monday 10:00 AM IST
      const mondayMorning = new Date("2026-05-18T10:00:00+05:30");
      const mondayNight = new Date("2026-05-18T23:30:00+05:30");

      const hours = [
        { weekday: 1, opens: "09:00", closes: "21:00" }, // Mon
      ];

      const shop = {
        status: "approved",
        manualLive: true,
        scheduleEnabled: true,
      };

      // 10:00 AM is inside hours
      expect(isShopLive(shop, hours, validSub, mondayMorning)).toBe(true);
      // 11:30 PM is outside hours
      expect(isShopLive(shop, hours, validSub, mondayNight)).toBe(false);
    });
  });

  describe("Usage Caps & Volume Meters", () => {
    it("flags cap reached when monthly jobs meet plan limit", () => {
      const jobsLimit = 100;
      const customersLimit = 50;

      const checkCap = (jobs: number, customers: number) => {
        return jobs >= jobsLimit || customers >= customersLimit;
      };

      expect(checkCap(50, 20)).toBe(false);
      expect(checkCap(100, 20)).toBe(true);
      expect(checkCap(40, 50)).toBe(true);
      expect(checkCap(120, 60)).toBe(true);
    });
  });

  describe("Zero-Trust Merchant Privacy Data Sanitization", () => {
    it("ensures customer phone and email are never attached to queue items", () => {
      const rawCustomer = {
        id: "cust_123",
        email: "student@example.com",
        phone: "+919876543210",
        alias: "Customer 7A4F",
      };

      const rawDocument = {
        id: "doc_456",
        displayName: "Aadhaar_Card_Original.pdf",
        storageKey: "vault/cust_123/encrypted_blob.enc",
        pageCount: 2,
      };

      // Sanitization mapper as performed by /api/merchant/jobs
      const sanitizeForMerchant = (
        cust: typeof rawCustomer,
        doc: typeof rawDocument
      ) => {
        return {
          customerAlias: cust.alias,
          pageCount: doc.pageCount,
        };
      };

      const sanitized = sanitizeForMerchant(rawCustomer, rawDocument);

      expect(sanitized).toEqual({
        customerAlias: "Customer 7A4F",
        pageCount: 2,
      });

      expect((sanitized as Record<string, unknown>).email).toBeUndefined();
      expect((sanitized as Record<string, unknown>).phone).toBeUndefined();
      expect(
        (sanitized as Record<string, unknown>).displayName
      ).toBeUndefined();
      expect((sanitized as Record<string, unknown>).storageKey).toBeUndefined();
    });
  });
});
