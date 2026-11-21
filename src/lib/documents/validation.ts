import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

export type SupportedFileType = "pdf" | "jpeg" | "png" | "webp";

/**
 * Validates file magic bytes against allowed document and image types.
 * Rejects executables, DOCX/ZIP archives, scripts, and unknown binary formats.
 */
export function detectMagicMime(buffer: Buffer): SupportedFileType | null {
  if (buffer.length < 12) return null;

  // PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return "pdf";
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // WebP: 'RIFF'....'WEBP'
  const isRiff = buffer.toString("ascii", 0, 4) === "RIFF";
  const isWebp = buffer.toString("ascii", 8, 12) === "WEBP";
  if (isRiff && isWebp) {
    return "webp";
  }

  return null;
}

/**
 * Converts a supported image format (JPEG, PNG, WebP) into a standard 1-page A4 PDF.
 */
export async function convertImageToPdf(
  rawBuffer: Buffer,
  type: "jpeg" | "png" | "webp"
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  let embeddedImage;

  if (type === "jpeg") {
    embeddedImage = await pdfDoc.embedJpg(rawBuffer);
  } else if (type === "png") {
    embeddedImage = await pdfDoc.embedPng(rawBuffer);
  } else {
    // WebP -> PNG conversion via sharp
    const pngBuffer = await sharp(rawBuffer).png().toBuffer();
    embeddedImage = await pdfDoc.embedPng(pngBuffer);
  }

  // Standard A4 dimensions in points: 595.28 x 841.89
  const a4Width = 595.28;
  const a4Height = 841.89;
  const page = pdfDoc.addPage([a4Width, a4Height]);

  // Fit image proportionally within printable margin (36pt = 0.5 inch margins)
  const margin = 36;
  const maxWidth = a4Width - margin * 2;
  const maxHeight = a4Height - margin * 2;

  const dims = embeddedImage.scaleToFit(maxWidth, maxHeight);
  const x = (a4Width - dims.width) / 2;
  const y = (a4Height - dims.height) / 2;

  page.drawImage(embeddedImage, {
    x,
    y,
    width: dims.width,
    height: dims.height,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Validates whether user quota allows uploading a document of given size.
 */
export function validateDocumentQuota(params: {
  monthlyUploadsUsed: number;
  monthlyUploadsLimit: number;
  currentVaultBytes: number;
  maxVaultBytes: number;
  incomingSizeBytes: number;
}): { allowed: boolean; error?: string } {
  const {
    monthlyUploadsUsed,
    monthlyUploadsLimit,
    currentVaultBytes,
    maxVaultBytes,
    incomingSizeBytes,
  } = params;

  if (monthlyUploadsUsed >= monthlyUploadsLimit) {
    return {
      allowed: false,
      error: `You have reached your monthly upload limit of ${monthlyUploadsLimit} documents. Please upgrade your plan or wait until next month.`,
    };
  }

  if (currentVaultBytes + incomingSizeBytes > maxVaultBytes) {
    const limitMb = Math.round(maxVaultBytes / (1024 * 1024));
    return {
      allowed: false,
      error: `Upload would exceed your vault storage limit of ${limitMb} MB. Please delete existing documents to free up space.`,
    };
  }

  return { allowed: true };
}
