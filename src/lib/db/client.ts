import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // ignore
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/neondb";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
