import sharp from "sharp";

export interface WatermarkMetadata {
  jobId: string;
  shopId: string;
  timestamp?: Date;
  color?: boolean;
}

/**
 * Creates an SVG watermark pattern overlay and composites it onto a rendered page buffer.
 * The watermark contains the Job ID, Shop ID, and serve timestamp at a 30-degree angle,
 * plus a footer confidentiality notice.
 */
export async function compositeWatermark(
  pageBuffer: Buffer,
  width: number,
  height: number,
  metadata: WatermarkMetadata
): Promise<Buffer> {
  const shortJob = metadata.jobId.slice(0, 8).toUpperCase();
  const shortShop = metadata.shopId.slice(0, 8).toUpperCase();
  const timeStr =
    (metadata.timestamp || new Date())
      .toISOString()
      .replace("T", " ")
      .slice(0, 19) + " UTC";

  const watermarkText = `PRINTSAFE • JOB #${shortJob} • SHOP #${shortShop} • ${timeStr}`;

  // Build SVG overlay
  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="wm-pattern" width="460" height="260" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
          <text x="20" y="80" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="#000000" fill-opacity="0.08" letter-spacing="1">
            ${watermarkText}
          </text>
          <text x="50" y="190" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="600" fill="#000000" fill-opacity="0.06" letter-spacing="1">
            CONFIDENTIAL • VIEWING LOGGED
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wm-pattern)" />
      <rect x="0" y="${Math.max(0, height - 32)}" width="${width}" height="32" fill="#ffffff" fill-opacity="0.85" />
      <text x="${Math.floor(width / 2)}" y="${Math.max(14, height - 12)}" text-anchor="middle" font-family="monospace, monospace" font-size="11" font-weight="bold" fill="#222222" fill-opacity="0.7">
        PRINTSAFE ZERO-TRUST PRINT &#8226; JOB #${shortJob} &#8226; VIEWING IS MONITORED &#8226; DO NOT COPY
      </text>
    </svg>
  `;

  let pipeline = sharp(pageBuffer).composite([
    {
      input: Buffer.from(svgOverlay),
      top: 0,
      left: 0,
    },
  ]);

  if (metadata.color === false) {
    pipeline = pipeline.grayscale();
  }

  return await pipeline.webp({ quality: 85 }).toBuffer();
}
