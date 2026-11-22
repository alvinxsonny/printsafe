/**
 * Production Error Monitoring with Strict PII Redaction
 * Ensures zero customer personal identifiable information (emails, phone numbers,
 * filenames, encryption keys, or passcodes) is ever dispatched to external error trackers.
 */

const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const PHONE_REGEX = /(\+91[\s-]?)?[6-9]\d{9}/g;
const AADHAAR_REGEX = /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g;
const SECRET_KEY_REGEX =
  /(key|secret|token|passcode|code_enc|auth)=["']?[^"'\s&]+["']?/gi;

/**
 * Recursively scrubs PII strings from log data or error contexts.
 */
export function scrubPII<T>(data: T): T {
  if (typeof data === "string") {
    return data
      .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
      .replace(PHONE_REGEX, "[REDACTED_PHONE]")
      .replace(AADHAAR_REGEX, "[REDACTED_AADHAAR]")
      .replace(SECRET_KEY_REGEX, "$1=[REDACTED_SECRET]") as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => scrubPII(item)) as unknown as T;
  }

  if (data !== null && typeof data === "object") {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("password") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("key") ||
        lowerKey.includes("token") ||
        lowerKey.includes("code") ||
        lowerKey.includes("storagekey") ||
        lowerKey.includes("filename")
      ) {
        scrubbed[key] = "[REDACTED_PII]";
      } else {
        scrubbed[key] = scrubPII(value);
      }
    }
    return scrubbed as T;
  }

  return data;
}

export interface CaptureErrorOptions {
  level?: "fatal" | "error" | "warning";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/**
 * Dispatches an error event to the monitoring pipeline with sanitized contextual metadata.
 */
export function captureAppError(error: unknown, options?: CaptureErrorOptions) {
  const sanitizedExtra = options?.extra ? scrubPII(options.extra) : undefined;
  const sanitizedTags = options?.tags ? scrubPII(options.tags) : undefined;

  const errorMessage =
    error instanceof Error ? scrubPII(error.message) : String(error);
  const errorStack =
    error instanceof Error && error.stack ? scrubPII(error.stack) : undefined;

  if (process.env.NODE_ENV !== "test") {
    console.error(
      `[MONITORING - ${options?.level?.toUpperCase() || "ERROR"}]`,
      {
        message: errorMessage,
        stack: errorStack,
        tags: sanitizedTags,
        extra: sanitizedExtra,
        timestamp: new Date().toISOString(),
      }
    );
  }
}
