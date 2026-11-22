/**
 * Shared client-side PDF.js rendering utilities.
 *
 * Always call `initPdfWorker()` once before using getDocument() so the
 * GlobalWorkerOptions.workerSrc is set. This avoids the
 * "No GlobalWorkerOptions.workerSrc specified" console error.
 */

let workerInitialised = false;

/**
 * Dynamically imports pdfjs-dist and sets the worker source URL.
 * Safe to call multiple times – initialisation only runs once.
 */
export async function getPdfjsLib() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!workerInitialised || !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    if (typeof window !== "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      workerInitialised = true;
    }
  }

  return pdfjsLib;
}

/**
 * Fetches a URL and returns its bytes as Uint8Array.
 */
export async function fetchPdfBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ||
        `Failed to fetch PDF (HTTP ${res.status})`
    );
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Loads a PDF document from raw bytes.
 */
export async function loadPdfDocument(bytes: Uint8Array) {
  const pdfjsLib = await getPdfjsLib();
  const task = pdfjsLib.getDocument({
    data: bytes,
    useSystemFonts: true,
    disableFontFace: false,
  });
  return task.promise;
}

/**
 * Renders a single PDF page onto a new <canvas> element and returns its data URL.
 * @param pdfDoc - A PDFDocumentProxy returned by loadPdfDocument
 * @param pageNo - 1-based page number
 * @param scale  - Render scale (default 1.5 ≈ 108 DPI; use 2.0 for high-DPI)
 */
export async function renderPageToDataUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  pageNo: number,
  scale = 1.5
): Promise<string> {
  const page = await pdfDoc.getPage(pageNo);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  return canvas.toDataURL("image/webp", 0.92);
}

/**
 * Renders a single page onto an *existing* canvas element (useful for
 * React refs where you want to keep the same DOM node).
 */
export async function renderPageToCanvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  pageNo: number,
  canvas: HTMLCanvasElement,
  scale = 1.5
): Promise<void> {
  const page = await pdfDoc.getPage(pageNo);
  const viewport = page.getViewport({ scale });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
}
