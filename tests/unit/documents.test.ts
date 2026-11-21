import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import {
  detectMagicMime,
  convertImageToPdf,
  validateDocumentQuota,
} from "@/lib/documents/validation";

describe("Document Vault Validation and Conversion", () => {
  describe("detectMagicMime", () => {
    it("identifies valid PDF magic bytes", () => {
      const pdfHeader = Buffer.from("%PDF-1.7\n%1234\n");
      expect(detectMagicMime(pdfHeader)).toBe("pdf");
    });

    it("identifies valid JPEG magic bytes", () => {
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      expect(detectMagicMime(jpegHeader)).toBe("jpeg");
    });

    it("identifies valid PNG magic bytes", () => {
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      expect(detectMagicMime(pngHeader)).toBe("png");
    });

    it("identifies valid WebP magic bytes", () => {
      // 'RIFF' (4 bytes) + length (4 bytes) + 'WEBP' (4 bytes)
      const webpHeader = Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.from([0x20, 0x00, 0x00, 0x00]),
        Buffer.from("WEBP"),
      ]);
      expect(detectMagicMime(webpHeader)).toBe("webp");
    });

    it("rejects DOCX / ZIP magic bytes (PK\\x03\\x04)", () => {
      const zipHeader = Buffer.from([
        0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00,
      ]);
      expect(detectMagicMime(zipHeader)).toBeNull();
    });

    it("rejects text and shell script files", () => {
      const textHeader = Buffer.from("#!/usr/bin/env bash\necho 'hello'");
      expect(detectMagicMime(textHeader)).toBeNull();
    });

    it("rejects truncated buffers (< 12 bytes)", () => {
      const shortBuf = Buffer.from("%PDF-");
      expect(detectMagicMime(shortBuf)).toBeNull();
    });
  });

  describe("convertImageToPdf", () => {
    it("converts a PNG image to a single-page A4 PDF", async () => {
      // Create a 100x100 solid green PNG using sharp
      const pngBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 18, g: 114, b: 74, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const pdfBuffer = await convertImageToPdf(pngBuffer, "png");
      expect(pdfBuffer).toBeInstanceOf(Buffer);

      // Verify the generated PDF using pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      expect(pdfDoc.getPageCount()).toBe(1);

      const page = pdfDoc.getPage(0);
      const { width, height } = page.getSize();
      // Standard A4 is approx 595.28 x 841.89 points
      expect(Math.round(width)).toBe(595);
      expect(Math.round(height)).toBe(842);
    });

    it("converts a JPEG image to a single-page A4 PDF", async () => {
      const jpegBuffer = await sharp({
        create: {
          width: 120,
          height: 80,
          channels: 3,
          background: { r: 255, g: 184, b: 77 },
        },
      })
        .jpeg()
        .toBuffer();

      const pdfBuffer = await convertImageToPdf(jpegBuffer, "jpeg");
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      expect(pdfDoc.getPageCount()).toBe(1);
    });
  });

  describe("validateDocumentQuota", () => {
    it("allows upload when within monthly and storage limits", () => {
      const result = validateDocumentQuota({
        monthlyUploadsUsed: 5,
        monthlyUploadsLimit: 10,
        currentVaultBytes: 20 * 1024 * 1024,
        maxVaultBytes: 100 * 1024 * 1024,
        incomingSizeBytes: 5 * 1024 * 1024,
      });

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects upload when monthly limit is reached", () => {
      const result = validateDocumentQuota({
        monthlyUploadsUsed: 10,
        monthlyUploadsLimit: 10,
        currentVaultBytes: 10 * 1024 * 1024,
        maxVaultBytes: 100 * 1024 * 1024,
        incomingSizeBytes: 1 * 1024 * 1024,
      });

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("monthly upload limit");
    });

    it("rejects upload when vault storage would exceed capacity", () => {
      const result = validateDocumentQuota({
        monthlyUploadsUsed: 1,
        monthlyUploadsLimit: 10,
        currentVaultBytes: 95 * 1024 * 1024,
        maxVaultBytes: 100 * 1024 * 1024,
        incomingSizeBytes: 10 * 1024 * 1024, // 95 + 10 = 105 MB > 100 MB
      });

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("vault storage limit");
    });
  });
});
