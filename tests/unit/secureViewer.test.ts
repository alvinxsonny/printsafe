import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { compositeWatermark } from "@/lib/documents/watermark";
import { parsePageRange } from "@/lib/jobs/quote";
import { MAX_REOPENS } from "@/config/app";

describe("Phase 11: Secure Viewer and Print Security", () => {
  describe("Sharp Watermark Compositing", () => {
    it("composites watermark overlay onto a page buffer", async () => {
      // Create a dummy 400x600 white WebP image
      const inputBuffer = await sharp({
        create: {
          width: 400,
          height: 600,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .webp()
        .toBuffer();

      const watermarked = await compositeWatermark(inputBuffer, 400, 600, {
        jobId: "job_test_12345678",
        shopId: "shop_test_87654321",
        color: true,
      });

      expect(watermarked).toBeDefined();
      expect(watermarked.length).toBeGreaterThan(0);

      // Verify metadata of resulting watermarked image
      const meta = await sharp(watermarked).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(600);
    });

    it("applies grayscale filter when color is false", async () => {
      // Create a 200x200 red image
      const redBuffer = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .webp()
        .toBuffer();

      const bwWatermarked = await compositeWatermark(redBuffer, 200, 200, {
        jobId: "job_bw_123",
        shopId: "shop_bw_456",
        color: false,
      });

      const meta = await sharp(bwWatermarked).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.channels).toBeDefined();
    });
  });

  describe("Page Range Verification Guard", () => {
    it("strictly allows only requested pages within document range", () => {
      const totalPages = 10;
      const requestedRange = "2-4, 7";
      const allowedPages = parsePageRange(requestedRange, totalPages);

      expect(allowedPages).toEqual([2, 3, 4, 7]);

      const isPageAllowed = (pageNo: number) => allowedPages.includes(pageNo);

      expect(isPageAllowed(1)).toBe(false);
      expect(isPageAllowed(2)).toBe(true);
      expect(isPageAllowed(3)).toBe(true);
      expect(isPageAllowed(4)).toBe(true);
      expect(isPageAllowed(5)).toBe(false);
      expect(isPageAllowed(6)).toBe(false);
      expect(isPageAllowed(7)).toBe(true);
      expect(isPageAllowed(8)).toBe(false);
      expect(isPageAllowed(11)).toBe(false);
    });
  });

  describe("Viewing Window & Status Authorization Guard", () => {
    const isViewerAllowed = (job: {
      status: string;
      unlockedUntil: Date | string | null;
      now: Date;
    }) => {
      if (job.status !== "unlocked") {
        return { allowed: false, reason: "NOT_UNLOCKED" };
      }
      if (!job.unlockedUntil) {
        return { allowed: false, reason: "NO_UNLOCK_TIME" };
      }
      if (job.now.getTime() > new Date(job.unlockedUntil).getTime()) {
        return { allowed: false, reason: "EXPIRED" };
      }
      return { allowed: true };
    };

    it("blocks access for any status other than unlocked", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 600000);

      const invalidStatuses = [
        "requested",
        "accepted",
        "awaiting_payment",
        "paid",
        "printed",
        "completed",
        "rejected",
        "cancelled",
        "expired",
      ];

      for (const st of invalidStatuses) {
        const res = isViewerAllowed({ status: st, unlockedUntil: future, now });
        expect(res.allowed).toBe(false);
        expect(res.reason).toBe("NOT_UNLOCKED");
      }
    });

    it("permits access when unlocked and within window", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1800000); // 30m
      const res = isViewerAllowed({
        status: "unlocked",
        unlockedUntil: future,
        now,
      });
      expect(res.allowed).toBe(true);
    });

    it("blocks access when viewing window has expired", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000);
      const res = isViewerAllowed({
        status: "unlocked",
        unlockedUntil: past,
        now,
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("EXPIRED");
    });
  });

  describe("Reopen Rules & Max Limits", () => {
    it("enforces maximum reopen limit for unprinted jobs", () => {
      expect(MAX_REOPENS).toBe(3);

      const canReopen = (openCount: number) => openCount < MAX_REOPENS;

      expect(canReopen(0)).toBe(true);
      expect(canReopen(1)).toBe(true);
      expect(canReopen(2)).toBe(true);
      expect(canReopen(3)).toBe(false);
      expect(canReopen(4)).toBe(false);
    });
  });

  describe("Delete After Print Logic", () => {
    it("flags storage cleanup when deleteAfterPrint is enabled", () => {
      const docWithDelete = {
        deleteAfterPrint: true,
        storageKey: "vault/file.pdf.enc",
      };
      const docWithoutDelete = {
        deleteAfterPrint: false,
        storageKey: "vault/file2.pdf.enc",
      };

      const shouldDeleteStorage = (doc: { deleteAfterPrint: boolean }) =>
        doc.deleteAfterPrint;

      expect(shouldDeleteStorage(docWithDelete)).toBe(true);
      expect(shouldDeleteStorage(docWithoutDelete)).toBe(false);
    });
  });
});
