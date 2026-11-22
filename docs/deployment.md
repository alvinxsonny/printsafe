# PrintSafe: Production Deployment & Launch Guide (Phase 17)

This guide documents the complete deployment architecture, configuration steps, security rules, and pre-flight checklist for deploying PrintSafe to production.

---

## 1. Vercel Deployment

PrintSafe is built on Next.js 16 (App Router) with Turbopack and server actions, optimized for deployment on Vercel or containerized runtimes.

### Step-by-Step Vercel Setup:

1. **Import Git Repository:**
   - In the Vercel Dashboard, select **Add New Project** $\rightarrow$ **Import Git Repository** (`alvinxsonny/printsafe`).
   - Framework Preset: **Next.js**.
   - Root Directory: `./`.
   - Build Command: `pnpm build` (default).
   - Install Command: `pnpm install` (default).

2. **Production Database (Neon):**
   - Use the Neon **`main`** production branch connection string (pooled URL for `DATABASE_URL`, direct unpooled URL for `DATABASE_URL_UNPOOLED`).
   - Run production schema migrations:
     ```bash
     pnpm db:migrate
     ```

3. **Configure Environment Variables:**
   Add all variables detailed in [Section 3](#3-environment-variables-matrix) to Vercel Project Settings under **Environment Variables** for `Production` and `Preview`.

4. **Connect Custom Domain & HTTPS:**
   - Add your custom production domain (e.g., `printsafe.in` or `app.printsafe.in`).
   - Update `NEXT_PUBLIC_APP_URL=https://yourdomain.com` in environment variables.

---

## 2. Vercel Cron Configuration (`vercel.json`)

Vercel Cron is configured in the repository root (`vercel.json`) to automate the daily database hygiene and sweep worker:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/sweep",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Sweep Operations Executed at 02:00 UTC Daily:

- Deletes expired documents and cleans their encrypted R2/S3 storage blobs.
- Purges leftover uploads abandoned in `incoming/` after 24 hours.
- Transitions stale print requests unanswered after 10 minutes to `expired`.
- Automatically marks lapsed shop subscriptions (> 3-day grace period) as `suspended` and takes their shop Offline.
- Initiates DPDP-compliant data minimisation notices for accounts inactive for over one year.

### Authentication:

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>`. The route handler at `src/app/api/cron/sweep/route.ts` verifies this token before executing.

---

## 3. Environment Variables Matrix

| Variable                       |  Required In  | Description / Instructions                                                  |
| :----------------------------- | :-----------: | :-------------------------------------------------------------------------- |
| `DATABASE_URL`                 |  Production   | Neon PostgreSQL pooled connection string (`?sslmode=require`)               |
| `DATABASE_URL_UNPOOLED`        | CI/Migrations | Neon PostgreSQL direct unpooled connection string (used by Drizzle Kit)     |
| `BETTER_AUTH_SECRET`           |  Production   | 64-character random hex string (`openssl rand -hex 32`)                     |
| `FILE_MASTER_KEY`              |  Production   | 32 random bytes, base64 encoded (`openssl rand -base64 32`)                 |
| `CRON_SECRET`                  |  Production   | 32 random bytes hex secret for `/api/cron/sweep` authentication             |
| `R2_ACCOUNT_ID`                |  Production   | Cloudflare Account ID for private R2 object storage                         |
| `R2_ACCESS_KEY_ID`             |  Production   | Cloudflare R2 API Token Access Key ID                                       |
| `R2_SECRET_ACCESS_KEY`         |  Production   | Cloudflare R2 API Token Secret Access Key                                   |
| `R2_BUCKET_NAME`               |  Production   | Bucket name (e.g., `printsafe-vault-prod`)                                  |
| `NEXT_PUBLIC_R2_PUBLIC_URL`    |   Optional    | Custom public domain if serving public static assets                        |
| `RAZORPAY_KEY_ID`              |  Production   | Razorpay API Key ID (`rzp_live_...` or `rzp_test_...`)                      |
| `RAZORPAY_KEY_SECRET`          |  Production   | Razorpay API Secret                                                         |
| `RAZORPAY_WEBHOOK_SECRET`      |  Production   | Shared webhook signing secret configured in Razorpay Dashboard              |
| `SMTP_HOST`                    |  Production   | SMTP server hostname (e.g., `smtp.brevo.com` or `smtp.resend.com`)          |
| `SMTP_PORT`                    |  Production   | SMTP port (`465` for SSL, `587` for TLS)                                    |
| `SMTP_USER`                    |  Production   | SMTP username                                                               |
| `SMTP_PASS`                    |  Production   | SMTP password                                                               |
| `EMAIL_FROM`                   |  Production   | Sender address (e.g., `PrintSafe <no-reply@yourdomain.com>`)                |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |  Production   | Web Push VAPID public key                                                   |
| `VAPID_PRIVATE_KEY`            |  Production   | Web Push VAPID private key                                                  |
| `VAPID_SUBJECT`                |  Production   | Contact email or URL for VAPID (`mailto:security@yourdomain.com`)           |
| `ADMIN_EMAILS`                 |  Production   | Comma-separated list of administrative emails (OTP login at `/admin/login`) |
| `NEXT_PUBLIC_APP_URL`          |  Production   | Canonical public URL (e.g., `https://printsafe.in`)                         |
| `NEXT_PUBLIC_MAP_TILE_URL`     |   Optional    | Custom map tile provider template (defaults to OSM tiles)                   |

---

## 4. Razorpay Webhook Configuration

1. In the **Razorpay Dashboard** (Live Mode), navigate to **Settings** $\rightarrow$ **Webhooks**.
2. Click **Add New Webhook**:
   - **Webhook URL:** `https://yourdomain.com/api/payments/webhook`
   - **Secret:** Enter the random string set in `RAZORPAY_WEBHOOK_SECRET`.
   - **Active Events to subscribe:**
     - `payment.captured` (triggers Far-mode job transition to `paid` and creates passcode)
     - `payment.failed` (alerts customer to retry)
     - `refund.processed` (updates audit logs and reconciles ledger)
3. Signature verification is automatically enforced with constant-time HMAC-SHA256 comparison in `src/app/api/payments/webhook/route.ts`.

---

## 5. Storage (Cloudflare R2 / AWS S3) Configuration

### 5.1 Bucket CORS Policy

Configure CORS on the private storage bucket to allow direct client presigned `PUT` uploads:

```json
[
  {
    "AllowedOrigins": ["https://printsafe.in", "https://*.vercel.app"],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": [
      "Content-Type",
      "Content-Disposition",
      "x-amz-server-side-encryption"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### 5.2 Bucket Lifecycle Rules

Set an automated lifecycle rule:

- **Prefix:** `incoming/`
- **Action:** Delete objects older than **1 day**.
- All valid uploads are moved and encrypted into `vault/` within seconds; this rule cleans abandoned uploads.

---

## 6. Tile Provider & Geocoding Strategy

- **OpenStreetMap Standard Tiles:** Allowed in default CSP (`https://*.tile.openstreetmap.org`). Suitable for low-to-medium traffic.
- **Commercial Tile Provider:** For high production traffic, configure `NEXT_PUBLIC_MAP_TILE_URL` (e.g., Protomaps, Stadia Maps, or Mapbox) and add their domain to `next.config.ts` CSP.
- **Nominatim Geocoding:** Reverse geocoding server proxy (`/api/geo/reverse`) is strictly throttled to 1 request/second with custom `User-Agent` per Nominatim guidelines.

---

## 7. Containerized Deployment Option (Docker / Cloud Run)

If deploying to environments with container support or where native `pdftoppm` rendering is preferred over serverless canvas, use the provided multi-stage `Dockerfile`:

```bash
# Build production Docker image
docker build -t printsafe:latest .

# Run container
docker run -p 3000:3000 --env-file .env.production printsafe:latest
```

The container includes:

- Alpine Linux with `poppler-utils` (`pdftoppm`)
- Node.js 20 LTS runner
- Non-root user (`nextjs:nodejs`) for least-privilege security

---

## 8. Error Monitoring & PII Scrubbing

The monitoring utility (`src/lib/security/monitoring.ts`) strips customer PII before any diagnostic event is logged or dispatched:

- Automatically redacts email addresses, Indian phone numbers (`+91`), and Aadhaar numbers.
- Recursively scrubs object keys matching `password`, `secret`, `key`, `token`, `code`, `storageKey`, or `filename`.

---

## 9. Pre-Flight Launch Checklist

Complete and verify each item before announcing public launch:

- [ ] **Database:** Neon `main` branch migrated (`pnpm db:migrate`) and reference plan rows seeded.
- [ ] **Payments:** Razorpay switched to Live Mode keys; webhook endpoint verified and active.
- [ ] **Admins:** `ADMIN_EMAILS` populated with verified administrative personnel; tested at `/admin/login`.
- [ ] **Storage:** Private R2/S3 bucket CORS and 1-day `incoming/` lifecycle rules active.
- [ ] **Automation:** Vercel Cron confirmed active in dashboard calling `/api/cron/sweep` daily.
- [ ] **Legal Review:** Plain-language `/privacy` and `/terms` reviewed by legal counsel.
- [ ] **Pilot Verification:** First 3 to 5 pilot print shops onboarded and verified through the admin workflow.
- [ ] **Backups:** Database point-in-time restore tested on Neon.
- [ ] **Sanitization:** Zero test or dummy data in production database.
