import { describe, it, expect } from "vitest";
import { parsePageRange, calculateJobQuote } from "@/lib/jobs/quote";

describe("Job Quotation & Page Range Parser", () => {
  describe("parsePageRange", () => {
    it("parses 'all' into complete document page array", () => {
      const pages = parsePageRange("all", 5);
      expect(pages).toEqual([1, 2, 3, 4, 5]);
    });

    it("parses comma-separated pages and ranges correctly", () => {
      const pages = parsePageRange("1-3, 5, 8-9", 10);
      expect(pages).toEqual([1, 2, 3, 5, 8, 9]);
    });

    it("deduplicates and sorts overlapping ranges", () => {
      const pages = parsePageRange("3-5, 2-4, 1", 10);
      expect(pages).toEqual([1, 2, 3, 4, 5]);
    });

    it("clamps out-of-bounds page requests to total document pages", () => {
      const pages = parsePageRange("1-15, 20", 5);
      expect(pages).toEqual([1, 2, 3, 4, 5]);
    });

    it("falls back to all pages on empty or invalid inputs", () => {
      expect(parsePageRange("", 4)).toEqual([1, 2, 3, 4]);
      expect(parsePageRange("invalid", 3)).toEqual([1, 2, 3]);
    });
  });

  describe("calculateJobQuote", () => {
    const defaultParams = {
      totalDocumentPages: 10,
      priceBwPaise: 200, // ₹2.00
      priceColorPaise: 1000, // ₹10.00
    };

    it("calculates single-sided B&W quote correctly", () => {
      const result = calculateJobQuote({
        ...defaultParams,
        copies: 1,
        duplex: false,
        color: false,
      });

      expect(result.pagesCount).toBe(10);
      expect(result.sheets).toBe(10);
      expect(result.quotePaise).toBe(2000); // 10 * ₹2.00 = ₹20.00
    });

    it("calculates duplex (double-sided) B&W quote correctly with halved sheets", () => {
      const result = calculateJobQuote({
        ...defaultParams,
        copies: 1,
        duplex: true,
        color: false,
      });

      expect(result.pagesCount).toBe(10);
      expect(result.sheets).toBe(5); // 10 pages on 5 sheets
      expect(result.quotePaise).toBe(2000); // Charged per printed page impression
    });

    it("rounds up odd sheet counts for duplex printing", () => {
      const result = calculateJobQuote({
        ...defaultParams,
        pageRange: "1-5", // 5 pages
        copies: 1,
        duplex: true,
        color: false,
      });

      expect(result.pagesCount).toBe(5);
      expect(result.sheets).toBe(3); // ceil(5 / 2) = 3 sheets
      expect(result.quotePaise).toBe(1000); // 5 * ₹2.00 = ₹10.00
    });

    it("applies color pricing when color mode is selected", () => {
      const result = calculateJobQuote({
        ...defaultParams,
        pageRange: "1-2",
        copies: 3,
        duplex: false,
        color: true,
      });

      expect(result.pagesCount).toBe(2);
      expect(result.sheets).toBe(6); // 2 pages * 3 copies
      expect(result.quotePaise).toBe(6000); // 6 * ₹10.00 = ₹60.00
    });
  });
});
