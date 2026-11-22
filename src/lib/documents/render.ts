import sharp from "sharp";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, documentPages } from "@/lib/db/schema";
import { getObject, putObject } from "@/lib/storage/client";
import { unwrapDataKey, decryptBlob } from "@/lib/storage/crypto";

export interface RenderPageResult {
  pageBuffer: Buffer;
  width: number;
  height: number;
}

export interface PageRenderer {
  render(pdfBuffer: Buffer, pageNo: number): Promise<RenderPageResult>;
}

/**
 * PDF.js + @napi-rs/canvas page renderer.
 * Renders PDF pages to 150 DPI and encodes them to WebP using sharp.
 */
export class PdfJsPageRenderer implements PageRenderer {
  async render(pdfBuffer: Buffer, pageNo: number): Promise<RenderPageResult> {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = await import("@napi-rs/canvas");

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      disableFontFace: false,
    });

    const pdfDocument = await loadingTask.promise;
    if (pageNo < 1 || pageNo > pdfDocument.numPages) {
      throw new Error(
        `Requested page ${pageNo} is out of bounds (1-${pdfDocument.numPages})`
      );
    }

    const page = await pdfDocument.getPage(pageNo);

    // 150 DPI: 150 / 72 ≈ 2.0833 scale factor
    const scale = 150 / 72;
    const viewport = page.getViewport({ scale });

    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Clear canvas to white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const renderContext = {
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    };

    await page.render(renderContext).promise;

    const pngBuffer = canvas.toBuffer("image/png");
    const webpBuffer = await sharp(pngBuffer).webp({ quality: 85 }).toBuffer();

    return {
      pageBuffer: webpBuffer,
      width,
      height,
    };
  }
}

// Default singleton page renderer
export const defaultPageRenderer: PageRenderer = new PdfJsPageRenderer();

/**
 * Renders a document page, with caching in document_pages and storage.
 * Stores raw rendered WebP pages, with backward-compatibility for legacy encrypted blobs.
 */
export async function renderPage(
  documentId: string,
  pageNo: number,
  renderer: PageRenderer = defaultPageRenderer
): Promise<RenderPageResult> {
  // 1. Fetch document record
  const docRows = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (docRows.length === 0) {
    throw new Error(`Document not found: ${documentId}`);
  }

  const doc = docRows[0];
  let dataKey: Buffer | null = null;
  if (doc.wrappedKey) {
    try {
      dataKey = unwrapDataKey(doc.wrappedKey);
    } catch {
      dataKey = null;
    }
  }

  // 2. Check if page is already cached in document_pages
  const cachedRows = await db
    .select()
    .from(documentPages)
    .where(
      and(
        eq(documentPages.documentId, documentId),
        eq(documentPages.pageNo, pageNo)
      )
    )
    .limit(1);

  if (cachedRows.length > 0) {
    const cached = cachedRows[0];
    try {
      const pageBlob = await getObject(cached.storageKey);
      let webpBuffer = pageBlob;
      // If legacy encrypted (doesn't start with RIFF) and dataKey is available, decrypt
      if (
        dataKey &&
        pageBlob.length >= 28 &&
        pageBlob.subarray(0, 4).toString() !== "RIFF"
      ) {
        try {
          webpBuffer = decryptBlob(pageBlob, dataKey);
        } catch {
          webpBuffer = pageBlob;
        }
      }
      return {
        pageBuffer: webpBuffer,
        width: cached.width,
        height: cached.height,
      };
    } catch (err) {
      console.warn(
        `Failed to read cached page ${pageNo} for ${documentId}, re-rendering:`,
        err
      );
    }
  }

  // 3. Page not cached: fetch original document from storage
  const rawPdf = await getObject(doc.storageKey);
  let plainPdfBuffer = rawPdf;
  // If stored with legacy encryption (doesn't start with %PDF) and dataKey is available, decrypt
  if (
    dataKey &&
    rawPdf.length >= 28 &&
    rawPdf.subarray(0, 4).toString() !== "%PDF"
  ) {
    try {
      plainPdfBuffer = decryptBlob(rawPdf, dataKey);
    } catch {
      plainPdfBuffer = rawPdf;
    }
  }

  // 4. Render using the configured renderer
  const renderResult = await renderer.render(plainPdfBuffer, pageNo);

  // 5. Cache raw WebP page in storage
  const pageStorageKey = `pages/${documentId}/${pageNo}.webp`;
  await putObject(pageStorageKey, renderResult.pageBuffer, "image/webp");

  // 6. Record cache row in document_pages
  await db
    .insert(documentPages)
    .values({
      id: crypto.randomUUID(),
      documentId,
      pageNo,
      storageKey: pageStorageKey,
      width: renderResult.width,
      height: renderResult.height,
    })
    .onConflictDoNothing();

  return renderResult;
}

/**
 * Pre-renders and caches initial pages (pages 1 to N, default 3) at upload finalization.
 */
export async function warmDocumentPages(
  documentId: string,
  pageCount: number,
  maxWarmPages: number = 3
): Promise<void> {
  const warmTarget = Math.min(pageCount, maxWarmPages);
  for (let p = 1; p <= warmTarget; p++) {
    try {
      await renderPage(documentId, p);
    } catch (err) {
      console.warn(`Failed warming page ${p} for document ${documentId}:`, err);
    }
  }
}
