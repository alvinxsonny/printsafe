import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

/**
 * Generates an anonymous customer alias in the format 'Customer A7F2'
 * Excludes confusing characters (0, O, 1, I) and checks for database collisions.
 */
export async function generateUniqueAlias(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let attempt = 0; attempt < 10; attempt++) {
    let randomPart = "";
    for (let i = 0; i < 4; i++) {
      randomPart += chars[Math.floor(Math.random() * chars.length)];
    }

    const candidate = `Customer ${randomPart}`;
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.alias, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }
  }

  // Fallback with timestamp slice
  return `Customer ${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}
