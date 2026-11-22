import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { Pool } from "@neondatabase/serverless";

try {
  process.loadEnvFile(".env.local");
} catch (e) {
  console.warn("Could not load .env.local directly:", e.message);
}

const DATABASE_URL = process.env.DATABASE_URL;
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const STORAGE_ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID;
const STORAGE_SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "printsafe";
const STORAGE_REGION = process.env.STORAGE_REGION || "auto";

console.log("=== PrintSafe Environment Reset ===");

async function resetCloudflareR2() {
  console.log("\n1. Resetting Cloudflare R2 Document Storage...");
  if (!STORAGE_ENDPOINT || !STORAGE_ACCESS_KEY_ID || !STORAGE_SECRET_ACCESS_KEY) {
    console.warn("Skipping Cloudflare R2: Missing credentials in environment.");
    return;
  }

  const s3 = new S3Client({
    region: STORAGE_REGION,
    endpoint: STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: STORAGE_ACCESS_KEY_ID,
      secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  let totalDeleted = 0;
  let continuationToken = undefined;

  do {
    const listCmd = new ListObjectsV2Command({
      Bucket: STORAGE_BUCKET,
      ContinuationToken: continuationToken,
    });

    const listRes = await s3.send(listCmd);
    const objects = listRes.Contents || [];

    if (objects.length > 0) {
      const deleteCmd = new DeleteObjectsCommand({
        Bucket: STORAGE_BUCKET,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key })),
          Quiet: true,
        },
      });

      await s3.send(deleteCmd);
      totalDeleted += objects.length;
      console.log(`   Deleted batch of ${objects.length} objects...`);
    }

    continuationToken = listRes.NextContinuationToken;
  } while (continuationToken);

  console.log(`✔ Cloudflare R2 Storage cleared: ${totalDeleted} objects deleted from bucket '${STORAGE_BUCKET}'.`);
}

async function resetNeonDatabase() {
  console.log("\n2. Resetting Neon PostgreSQL Database...");
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment.");
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const client = await pool.connect();
    try {
      console.log("   Connected to Neon database. Truncating data tables...");

      // Order of tables to truncate with CASCADE
      const tablesToTruncate = [
        "view_logs",
        "audit_logs",
        "notifications",
        "push_subscriptions",
        "webhook_events",
        "payments",
        "print_jobs",
        "document_pages",
        "documents",
        "shop_reviews",
        "shop_hours",
        "shop_subscriptions",
        "shops",
        "customer_profiles",
        "rate_limits",
        "sessions",
        "accounts",
        "verifications",
        "users",
      ];

      for (const table of tablesToTruncate) {
        try {
          await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        } catch (tableErr) {
          // Table might not exist yet if not created, ignore if undefined table
          console.log(`   Table "${table}": ${tableErr.message}`);
        }
      }

      console.log("✔ Application tables truncated successfully.");

      // Re-seed plans table
      console.log("   Re-seeding default plans...");
      await client.query(`
        INSERT INTO "plans" ("id", "audience", "code", "name", "price_paise", "period_days", "limits", "active", "created_at")
        VALUES 
          ('merchant_starter', 'merchant', 'starter', 'Starter', 29900, 30, '{"jobs_per_month": 100, "customers_per_month": 50, "devices": 1, "staff_logins": 1}'::jsonb, true, NOW()),
          ('merchant_growth', 'merchant', 'growth', 'Growth', 59900, 30, '{"jobs_per_month": 500, "customers_per_month": 250, "devices": 2, "staff_logins": 2, "priority_list": true}'::jsonb, true, NOW()),
          ('merchant_pro', 'merchant', 'pro', 'Pro', 99900, 30, '{"jobs_per_month": 1500, "customers_per_month": null, "devices": 5, "staff_logins": 5, "analytics": true}'::jsonb, true, NOW()),
          ('customer_free', 'customer', 'free', 'Free', 0, 3650, '{"uploads_per_month": 10, "vault_mb": 100}'::jsonb, true, NOW()),
          ('customer_plus', 'customer', 'plus', 'Plus', 4900, 30, '{"uploads_per_month": 100, "vault_mb": 2048}'::jsonb, true, NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "name" = EXCLUDED."name",
          "price_paise" = EXCLUDED."price_paise",
          "period_days" = EXCLUDED."period_days",
          "limits" = EXCLUDED."limits",
          "active" = EXCLUDED."active";
      `);

      console.log("✔ Plans seeded successfully.");
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    await resetCloudflareR2();
    await resetNeonDatabase();
    console.log("\n🎉 Full database and storage reset complete! You can start fresh.");
  } catch (err) {
    console.error("\n❌ Reset failed:", err);
    process.exit(1);
  }
}

main();
