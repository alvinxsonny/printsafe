import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // ignore
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
});
