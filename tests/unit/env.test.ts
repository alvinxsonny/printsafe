import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Environment schema validation", () => {
  const testSchema = z.object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
    DATABASE_URL: z.string().min(1),
    FILE_MASTER_KEY: z.string().min(1),
  });

  it("validates correct environment variables", () => {
    const valid = {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      FILE_MASTER_KEY: "base64key",
    };
    expect(testSchema.safeParse(valid).success).toBe(true);
  });

  it("fails fast with missing required variables", () => {
    const invalid = {
      NEXT_PUBLIC_APP_URL: "not-a-url",
    };
    const result = testSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
