import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Database-backed rate limiter using rate_limits table
 * @param key unique identifier (e.g. `otp:email:user@example.com` or `otp:ip:192.168.1.1`)
 * @param maxCount maximum requests allowed in window
 * @param windowSeconds time window in seconds
 */
export async function checkRateLimit(
  key: string,
  maxCount: number = 3,
  windowSeconds: number = 600
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const [existing] = await db
      .select()
      .from(rateLimits)
      .where(
        and(eq(rateLimits.key, key), gte(rateLimits.windowStart, windowStart))
      )
      .limit(1);

    if (existing) {
      if (existing.count >= maxCount) {
        return {
          success: false,
          remaining: 0,
          resetAt: new Date(
            existing.windowStart.getTime() + windowSeconds * 1000
          ),
        };
      }

      await db
        .update(rateLimits)
        .set({ count: sql`${rateLimits.count} + 1` })
        .where(
          and(
            eq(rateLimits.key, existing.key),
            eq(rateLimits.windowStart, existing.windowStart)
          )
        );

      return {
        success: true,
        remaining: maxCount - (existing.count + 1),
        resetAt,
      };
    }

    // Insert new rate limit window
    await db.insert(rateLimits).values({
      key,
      windowStart: now,
      count: 1,
    });

    return {
      success: true,
      remaining: maxCount - 1,
      resetAt,
    };
  } catch (error) {
    // In case of transient rate limit db error, allow request but log warning
    console.warn("Rate limit check error:", error);
    return {
      success: true,
      remaining: 1,
      resetAt,
    };
  }
}
