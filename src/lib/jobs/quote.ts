/**
 * Parses a page range string (e.g. "all", "1-3", "1, 3, 5-7") against a document's total page count.
 * Returns sorted, deduplicated page numbers within valid bounds [1, totalPages].
 */
export function parsePageRange(
  range: string | undefined | null,
  totalPages: number
): number[] {
  if (totalPages <= 0) return [];
  if (!range || range.trim().toLowerCase() === "all") {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const parts = range.split(",");
  const pagesSet = new Set<number>();

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr?.trim() || "", 10);
      const end = parseInt(endStr?.trim() || "", 10);

      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        const clampedEnd = Math.min(end, totalPages);
        for (let p = Math.min(start, totalPages); p <= clampedEnd; p++) {
          if (p >= 1 && p <= totalPages) {
            pagesSet.add(p);
          }
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        pagesSet.add(p);
      }
    }
  }

  const result = Array.from(pagesSet).sort((a, b) => a - b);
  return result.length > 0
    ? result
    : Array.from({ length: totalPages }, (_, i) => i + 1);
}

export interface QuoteCalculationParams {
  pageRange?: string;
  totalDocumentPages: number;
  copies?: number;
  duplex?: boolean;
  color?: boolean;
  priceBwPaise: number;
  priceColorPaise: number;
}

export interface QuoteCalculationResult {
  pagesCount: number;
  sheets: number;
  quotePaise: number;
  parsedPages: number[];
  perPagePricePaise: number;
}

/**
 * Calculates print sheets and total price quote in paise.
 * Rules (Section 7 & Phase 9 of plan.md):
 * - sheets: pages in range x copies, halved (rounded up) for double-sided;
 * - amount: per-page price (B&W or colour) x pages x copies.
 */
export function calculateJobQuote(
  params: QuoteCalculationParams
): QuoteCalculationResult {
  const {
    pageRange = "all",
    totalDocumentPages,
    copies = 1,
    duplex = true,
    color = false,
    priceBwPaise,
    priceColorPaise,
  } = params;

  const validCopies = Math.max(1, Math.min(99, Math.floor(copies) || 1));
  const parsedPages = parsePageRange(pageRange, totalDocumentPages);
  const pagesCount = parsedPages.length;

  const perPagePricePaise = color ? priceColorPaise : priceBwPaise;
  const totalPageImpressions = pagesCount * validCopies;

  const sheets = duplex
    ? Math.ceil(totalPageImpressions / 2)
    : totalPageImpressions;

  const quotePaise = perPagePricePaise * totalPageImpressions;

  return {
    pagesCount,
    sheets,
    quotePaise,
    parsedPages,
    perPagePricePaise,
  };
}
