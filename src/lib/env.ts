import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_UNPOOLED: z.string().min(1, "DATABASE_URL_UNPOOLED is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(16, "BETTER_AUTH_SECRET must be at least 16 chars"),
  ADMIN_EMAILS: z.string().min(1, "ADMIN_EMAILS is required"),
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
  EMAIL_FROM: z.string().min(1, "EMAIL_FROM is required"),
  STORAGE_ENDPOINT: z.string().min(1, "STORAGE_ENDPOINT is required"),
  STORAGE_REGION: z.string().default("auto"),
  STORAGE_BUCKET: z.string().min(1, "STORAGE_BUCKET is required"),
  STORAGE_ACCESS_KEY_ID: z.string().min(1, "STORAGE_ACCESS_KEY_ID is required"),
  STORAGE_SECRET_ACCESS_KEY: z
    .string()
    .min(1, "STORAGE_SECRET_ACCESS_KEY is required"),
  FILE_MASTER_KEY: z.string().min(1, "FILE_MASTER_KEY is required"),
  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .min(1, "RAZORPAY_WEBHOOK_SECRET is required"),
  PAYMENT_MODE: z.enum(["gateway", "direct_upi"]).default("gateway"),
  NEXT_PUBLIC_MAP_TILE_URL: z
    .string()
    .min(1, "NEXT_PUBLIC_MAP_TILE_URL is required"),
  NEXT_PUBLIC_MAP_ATTRIBUTION: z
    .string()
    .min(1, "NEXT_PUBLIC_MAP_ATTRIBUTION is required"),
  NOMINATIM_BASE_URL: z.string().url(),
  OVERPASS_URL: z.string().url(),
  GEO_USER_AGENT: z.string().min(1, "GEO_USER_AGENT is required"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_VAPID_PUBLIC_KEY is required"),
  VAPID_PUBLIC_KEY: z.string().min(1, "VAPID_PUBLIC_KEY is required"),
  VAPID_PRIVATE_KEY: z.string().min(1, "VAPID_PRIVATE_KEY is required"),
  VAPID_SUBJECT: z.string().min(1, "VAPID_SUBJECT is required"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 chars"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
    throw new Error(
      "Invalid or missing environment variables. Check .env.local against .env.example"
    );
  }
  return result.data;
}

export const env = validateEnv();
