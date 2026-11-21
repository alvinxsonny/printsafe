# PrintSafe: Build Plan (plan.md)

> Working name: **PrintSafe**. Tagline: *Print anywhere. Share nothing.*
> This file is the single source of truth for building the MVP. Read it fully before writing any code.

---

## 0. How to use this file

### For the human (you)

Build **one phase at a time**. Paste this prompt into Antigravity, changing the phase number:

```
Read plan.md completely. Implement ONLY Phase N and nothing from later phases.
Follow its Tasks and meet every Acceptance item. Run the Verify commands.
When done, tick the phase's boxes in the Progress tracker, then give me:
(1) what you built, (2) the files you added or changed, (3) any manual steps I must do.
Stop after that and wait for me.
```

Start a fresh chat for each phase if the agent gets confused. Commit to git after each phase.

### For the builder agent

1. Do only the phase you are told to do. Do not start the next one.
2. Obey section 2 (Non-negotiable rules) in every phase.
3. If a task needs an account, key or dashboard setting that only the human can do, stop and list the exact steps. Never invent credentials.
4. After each phase run: `pnpm lint`, `pnpm typecheck`, `pnpm build` (and `pnpm test` once tests exist). Fix every error before reporting.
5. Before using a library for the first time, read its current official docs. Library APIs change; do not rely on memory.
6. Keep files small and typed (TypeScript strict). No `any`, no commented-out code, no TODO placeholders left behind.

### Progress tracker (tick as phases finish)

- [x] Phase 0: Accounts and prerequisites (human)
- [x] Phase 1: Project scaffold
- [x] Phase 2: Design system and 3D UI kit
- [x] Phase 3: Database (Neon + PostGIS + Drizzle)
- [x] Phase 4: Authentication and roles
- [x] Phase 5: Merchant registration and Google Maps link extraction
- [x] Phase 6: Admin dashboard and merchant verification
- [ ] Phase 7: Secure document storage and vault
- [ ] Phase 8: Map and nearby shops (customer)
- [ ] Phase 9: Print requests (customer side)
- [ ] Phase 10: Merchant dashboard (live toggle, prices, queue)
- [ ] Phase 11: Secure viewer and print
- [ ] Phase 12: Payments (Razorpay) and plan limits
- [ ] Phase 13: Notifications
- [ ] Phase 14: Paper footprint tree and 3D polish
- [ ] Phase 15: Privacy, compliance and security hardening
- [ ] Phase 16: Testing and QA
- [ ] Phase 17: Deployment and launch checklist

---

## 1. The product in one page

**Problem.** To print at a neighbourhood Xerox shop, people send private files (Aadhaar, marksheets, bank forms) and their own phone number or email over WhatsApp or email. Shops rarely delete them. The result is document leaks, spam and identity-theft risk.

**Solution.** A web platform with three separate logins and dashboards:

| Role | What they do |
| --- | --- |
| **Customer** | Uploads documents to a private vault, presets print settings, finds nearby shops that are live on a map, sends a print request. Never shares a phone number or email with the shop. |
| **Merchant** (shop owner) | Registers the shop, waits for admin verification, goes Live or Offline, reviews requests, views the document only inside a locked viewer, and prints from it. Never receives the file or the customer's contact details. |
| **Admin** (PrintSafe team) | Verifies merchant registrations, approves or rejects them, manages plans, monitors the platform. Admins cannot open customer documents either. |

**Two handover modes**

- **Near (walk-in):** the customer is at or near the shop. The customer shows a one-time passcode at the counter, the merchant enters it to unlock the viewer, prints, and collects cash.
- **Far (pay now, collect later):** the customer pays online first. The merchant prints and marks it ready. The customer collects later and shows the same code at handover.

**Core promises (what the product guarantees)**

1. The shop never gets a copy of the file: no download button, no download endpoint. It sees watermarked page images for one job, for a limited time.
2. The shop never sees the customer's phone number or email. It sees an alias such as `Customer A7F2`.
3. Access ends when the job ends, and every view is logged.
4. Customers control retention: documents auto-expire and can be deleted any time.

**Honest limit (must appear in the privacy page and in docs):** a website cannot block screenshots, phone photos of a screen, or the browser's *Save as PDF*. PrintSafe makes leaks hard, traceable and short-lived, but cannot make them impossible. A future desktop *Print Agent* (not in this MVP) closes the Save-as-PDF gap.

**Creative feature.** A **paper footprint tree** on the customer dashboard: as the customer prints more sheets, the tree loses canopy tiers until it becomes a stump with logs. It nudges people toward sharing digitally.

---

## 2. Non-negotiable rules

1. **No dummy data anywhere.** No seed users, demo accounts, fake shops, placeholder phone numbers, lorem ipsum, fake stats, or "Login as demo" buttons. Every list starts empty and shows a proper empty state.
2. **No hardcoded secrets or credentials.** Everything comes from environment variables. Commit `.env.example` (names only, no values). Never commit `.env*` files.
3. **Reference data is allowed.** The merchant and customer plan definitions are real configuration, seeded by migration and editable by admins. They are not dummy data.
4. **The first admin is bootstrapped from `ADMIN_EMAILS`**, an env list of real emails. No admin password exists in code or the database.
5. **Tests may create their own fixtures only inside test code and only against a separate Neon test branch.** Never insert fixtures into development or production.
6. **Privacy by design.** Never log document content, filenames, emails or phone numbers. Never expose a merchant to a customer's email or phone.
7. **Server-side authorization on every route and action.** Never trust the client for role, ownership or price.
8. **All money is stored as integer paise.** Never floats.
9. **All timestamps are stored in UTC** and shown in the viewer's local time (Asia/Kolkata by default).
10. **Free-tier limits and prices change.** Verify limits of Neon, the email provider, object storage and Razorpay at build time.

---

## 3. Tech stack (and why)

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js (App Router) + TypeScript (strict)** | One codebase for UI and API, easy deployment |
| Package manager | **pnpm** | Fast, strict |
| Styling | **Tailwind CSS** + CSS variables for design tokens | Quick, consistent theming |
| UI primitives | **Radix UI** (via shadcn/ui components, restyled to our 3D look) | Accessible dialogs, menus, tabs |
| Motion | **motion** (Framer Motion) | Page transitions, 3D tilt, list animation |
| Fonts | **Inter** (body) and **Space Grotesk** (headings) via `next/font/google` | Required brand fonts, used everywhere |
| Database | **Neon Postgres** with **PostGIS** | Free serverless Postgres, geospatial "nearby shop" queries |
| ORM and migrations | **Drizzle ORM + drizzle-kit** | Typed, simple SQL migrations |
| DB driver | `@neondatabase/serverless` | Works on serverless runtimes |
| Auth | **Better Auth** with the Email OTP plugin | Passwordless, role-friendly, free |
| Email (OTP, notices) | **SMTP via Nodemailer** (Brevo free plan, or any SMTP) behind a `sendEmail()` wrapper | Free tier, swappable. Resend works too if you own a domain |
| File storage | **S3-compatible bucket** (Cloudflare R2 free tier; Backblaze B2 or Supabase Storage also work) via `@aws-sdk/client-s3` | Neon stores only data, not files |
| Encryption | Node `crypto`, **AES-256-GCM envelope encryption** | Files encrypted at rest with per-document keys |
| PDF to page images | `pdfjs-dist` + `@napi-rs/canvas`, encoded with `sharp` | Works without system binaries on most hosts |
| Maps | **Leaflet + react-leaflet** with **OpenStreetMap** tiles | Free, open |
| Geocoding | **Nominatim** (server proxy, cached, rate limited) | Free, no key |
| Shop data enrichment | **Overpass API** (OSM) | Free, optional |
| Payments | **Razorpay** (free to integrate and test; per-transaction fee only) | UPI, cards, no setup or AMC fee |
| Notifications | In-app + **Web Push** (`web-push`, VAPID) + email | Free |
| Validation | **zod** | Shared schemas for forms and APIs |
| Data fetching | **TanStack Query** (polling for live updates) | Simple "live" feel without paid realtime |
| Tests | **Vitest** (unit) + **Playwright** (end-to-end) | Standard |
| Hosting | **Vercel** for the demo or hackathon | Easy. Note: the Hobby plan is for non-commercial use; move to a paid plan or another host for a commercial launch |

**Known platform constraints the plan already designs around**

- Serverless request bodies are small (about 4.5 MB on Vercel), so documents upload **directly to the bucket with a presigned URL**, then a server step validates and encrypts them.
- PDF rendering can be slow, so pages are rendered **lazily on first request and then cached (encrypted)**, with the first 3 pages warmed at upload.
- The public OSM tile server and Nominatim are for light use only. Tile and geocoder URLs are env-configurable so you can switch to a tile provider's free tier or self-hosted tiles before public launch.

---

## 4. Architecture and folder structure

```
printsafe/
  plan.md
  .env.example
  drizzle/                      # generated SQL migrations (+ custom SQL for PostGIS)
  public/                       # manifest.webmanifest, sw.js, icons
  src/
    app/
      (marketing)/              # / , /privacy , /terms , /how-it-works
      (auth)/                   # /login /signup (customer)
      merchant/                 # /merchant/login /merchant/signup /merchant/onboarding ...
      admin/                    # /admin/login /admin ...
      app/                      # customer app: /app /app/vault /app/jobs ...
      api/                      # route handlers (webhooks, viewer images, geo proxy, cron)
    components/
      ui/                       # design system (Button3D, Card3D, Input, Modal, Toast...)
      map/                      # Leaflet map, pins, shop sheet
      tree/                     # paper footprint tree
      viewer/                   # secure viewer
    lib/
      auth/                     # Better Auth config, role guards
      db/                       # drizzle client, schema, queries
      storage/                  # bucket client, presign, encrypt/decrypt
      documents/                # validate, page count, render, watermark
      maps/                     # google link parser, resolver, geocode, overpass
      payments/                 # razorpay client, verify, webhook handlers
      jobs/                     # state machine, quote, codes, limits
      notify/                   # in-app, push, email
      security/                 # rate limit, headers, audit log
      env.ts                    # zod-validated env
    config/
      app.ts                    # constants (limits, windows, thresholds)
      plans.ts                  # plan definitions used by migration
    styles/globals.css          # tokens, fonts, 3D utility classes
  tests/
    unit/  e2e/
```

**Route map**

| Area | Routes |
| --- | --- |
| Public | `/`, `/how-it-works`, `/privacy`, `/terms` |
| Customer auth | `/login`, `/signup` |
| Customer app | `/app` (map home), `/app/vault`, `/app/vault/[id]`, `/app/jobs`, `/app/jobs/[id]`, `/app/settings` |
| Merchant auth | `/merchant/login`, `/merchant/signup` |
| Merchant | `/merchant/onboarding`, `/merchant` (dashboard), `/merchant/queue`, `/merchant/jobs/[id]` (detail), `/merchant/jobs/[id]/view` (secure viewer), `/merchant/settings`, `/merchant/billing` |
| Admin | `/admin/login`, `/admin` (overview), `/admin/merchants`, `/admin/merchants/[id]`, `/admin/plans`, `/admin/audit` |
| API | `/api/auth/*`, `/api/geo/search`, `/api/geo/reverse`, `/api/maps/resolve`, `/api/uploads/*`, `/api/viewer/[jobId]/page/[n]`, `/api/payments/webhook`, `/api/cron/sweep` |

---

## 5. Environment variables

`src/lib/env.ts` validates all of these with zod at startup. `.env.example` lists the names with empty values.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app |
| `DATABASE_URL` | Neon **pooled** connection string (app runtime) |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string (migrations) |
| `BETTER_AUTH_SECRET` | Long random secret for sessions |
| `ADMIN_EMAILS` | Comma-separated real admin emails (bootstrap) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Email sending |
| `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | Object storage |
| `FILE_MASTER_KEY` | 32 random bytes, base64. Wraps per-document keys |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Payments |
| `PAYMENT_MODE` | `gateway` (default) or `direct_upi` (fallback, see Phase 12) |
| `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION` | Map tiles (default OpenStreetMap) |
| `NOMINATIM_BASE_URL`, `OVERPASS_URL`, `GEO_USER_AGENT` | Geocoding. `GEO_USER_AGENT` must identify the app and include a real contact email |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push |
| `CRON_SECRET` | Protects `/api/cron/sweep` |

Constants that are not secrets live in `src/config/app.ts`:

```
PASSCODE_LENGTH = 4            // you asked for 4 digits; can be raised to 6 with one edit
PASSCODE_MAX_ATTEMPTS = 3
PASSCODE_TTL_MINUTES = 15
REQUEST_EXPIRY_MINUTES = 10    // unanswered requests expire
VIEW_WINDOW_MINUTES = 30       // how long the merchant can view after unlock
MAX_REOPENS = 3
NEAR_DEFAULT_RADIUS_M = 300    // suggests "near" mode below this distance
NEARBY_SEARCH_RADIUS_M = 5000
MAX_UPLOAD_MB = 15
MAX_PAGES_PER_DOCUMENT = 50
DEFAULT_RETENTION_DAYS = 30
SHEETS_PER_TREE_APPROX = 8333  // approximate; label as such in the UI
SHEETS_PER_CANOPY_TIER = 10    // playful visual scale for the tree
```

---

## 6. Data model

Use Drizzle schemas in `src/lib/db/schema/`. Better Auth creates its own tables (`user`, `session`, `account`, `verification`); add the fields `role` (`customer | merchant | admin`) and `alias` to `user`. Enable PostGIS with a custom migration: `CREATE EXTENSION IF NOT EXISTS postgis;`.

| Table | Key columns |
| --- | --- |
| `plans` | `id`, `audience` (`merchant`/`customer`), `code`, `name`, `price_paise`, `period_days`, `limits` (jsonb: `jobs_per_month`, `customers_per_month`, `devices`, `staff_logins`, `uploads_per_month`, `vault_mb`), `active`. Seeded from `config/plans.ts` by migration |
| `shops` | `id`, `owner_id`, `status` (`draft`, `pending_review`, `changes_requested`, `approved`, `rejected`, `suspended`), `name`, `address_line`, `locality`, `city`, `state`, `pincode`, `location` (geometry Point 4326), `google_maps_url`, `google_ftid`, `extraction` (jsonb: each field with value, source, confidence), `contact_phone`, `show_phone`, `gstin` (optional), `storefront_photo_key`, `services` (jsonb: bw, color, a3, duplex), `price_bw_paise`, `price_color_paise`, `manual_live` (bool), `schedule_enabled` (bool), `created_at`, `approved_at` |
| `shop_hours` | `shop_id`, `weekday` (0-6), `opens`, `closes` |
| `shop_reviews` | `id`, `shop_id`, `admin_id`, `decision` (`approved`/`changes_requested`/`rejected`/`suspended`/`reinstated`), `notes`, `checklist` (jsonb), `created_at` |
| `shop_subscriptions` | `id`, `shop_id`, `plan_id`, `status` (`trial`, `active`, `grace`, `expired`), `period_start`, `period_end`, `payment_id` |
| `customer_profiles` | `user_id`, `plan_id`, `plan_period_end`, `sheets_printed_total`, `notify_enabled`, `notify_area` (rounded lat/lng + radius, optional) |
| `documents` | `id`, `owner_id`, `display_name`, `mime`, `size_bytes`, `page_count`, `storage_key`, `wrapped_key`, `status` (`processing`, `ready`, `failed`, `deleted`), `default_settings` (jsonb), `delete_after_print` (bool), `expires_at`, `created_at` |
| `document_pages` | `document_id`, `page_no`, `storage_key`, `width`, `height` (rendered lazily, encrypted with the document key) |
| `print_jobs` | `id`, `customer_id`, `shop_id`, `document_id`, `mode` (`near`/`far`), `status` (see section 7), `settings` (jsonb: pages, copies, color, duplex, paper_size, orientation), `sheets`, `quote_paise`, `code_enc`, `code_expires_at`, `code_attempts`, `unlocked_until`, `open_count`, `requested_at`, `accepted_at`, `paid_at`, `printed_at`, `completed_at`, `expires_at` |
| `view_logs` | `id`, `job_id`, `shop_id`, `page_no`, `at` (never stores content) |
| `payments` | `id`, `kind` (`job`/`merchant_plan`/`customer_plan`), `ref_id`, `payer_user_id`, `amount_paise`, `status` (`created`, `paid`, `failed`, `refunded`), `razorpay_order_id`, `razorpay_payment_id`, `created_at` |
| `webhook_events` | `event_id` (unique), `type`, `received_at` (idempotency) |
| `notifications` | `id`, `user_id`, `type`, `payload` (jsonb, no PII), `read_at`, `created_at` |
| `push_subscriptions` | `id`, `user_id`, `endpoint`, `keys` (jsonb) |
| `audit_logs` | `id`, `actor_id`, `actor_role`, `action`, `entity`, `entity_id`, `meta` (jsonb), `created_at` |
| `rate_limits` | `key`, `window_start`, `count` |

**Required indexes:** GiST index on `(shops.location::geography)`, plus indexes on `print_jobs(shop_id, status)`, `print_jobs(customer_id)`, `documents(owner_id)`, `shops(status)`.

**Live status is computed, not stored:** a shop is *live* if `status = approved` AND subscription is `trial` or `active` or `grace` AND `manual_live = true` AND (`schedule_enabled = false` OR now is inside `shop_hours`). No cron needed for going live or offline.

---

## 7. Print job lifecycle

```
Near mode:  requested -> accepted -> unlocked -> printed -> completed
Far mode:   requested -> accepted -> awaiting_payment -> paid -> unlocked -> printed -> completed
Terminal:   rejected | cancelled | expired
```

| Transition | Who | Rules |
| --- | --- | --- |
| `requested` | Customer | Shop must be live, within plan limits. Quote is computed from the shop's prices, never trusted from the client |
| `accepted` | Merchant | Generates the handover code (`PASSCODE_LENGTH` digits), stored encrypted; the customer sees it in the app. Far mode moves to `awaiting_payment` |
| `rejected` / `cancelled` | Merchant / Customer | Reason is optional text with no personal data |
| `expired` | System | Unanswered after `REQUEST_EXPIRY_MINUTES` (computed on read plus cron sweep) |
| `paid` | Razorpay webhook | Verified signature only |
| `unlocked` | Merchant | Near: correct code entered (max attempts, then lock). Far: allowed when `paid`. Sets `unlocked_until` |
| `printed` | Merchant | Ends viewing, purges access, optionally deletes the document if `delete_after_print` |
| `completed` | Merchant | Near: cash received. Far: customer collected, code verified at handover |

Every transition writes an `audit_logs` row and a notification to the other party.

---

## 8. UX flows

### Customer
1. **Landing** explains the problem in one screen with an isometric 3D hero and two buttons: *I want to print* and *I own a print shop*.
2. **Sign up** with email OTP. A required consent checkbox links to the privacy notice. A random alias (e.g. `Customer A7F2`) is created.
3. **Home** is a full-screen map. It asks for location permission; if denied, the user searches a place. A list/sheet shows live shops nearby with distance, prices and services. Closed shops are hidden behind a *Show closed shops* toggle.
4. **Vault** lets the user drag and drop PDF/JPG/PNG/WebP, see page thumbnails, preset print settings (pages, copies, colour or B&W, single or double sided, paper size) and choose retention (*Delete after printing* or *Keep for N days*).
5. **Request**: pick a document, confirm settings, see the quote, choose *Walk in* or *Pay now, collect later* (suggested by distance), send.
6. **Track**: live status timeline. When accepted, the handover code is shown large. Pay button appears in far mode.
7. **Done**: completion screen, the paper footprint tree updates.

### Merchant
1. **Sign up** (email OTP) then the **onboarding wizard**: (1) paste Google Maps link, (2) confirm the map pin and details, (3) services and per-page prices, (4) opening hours, (5) storefront photo and submit.
2. **Pending screen** shows status. If admins request changes, the wizard reopens with their notes.
3. **Approved**: a 30-day free trial on Growth limits starts. Dashboard shows a big **Live / Offline** switch, today's stats and the request queue.
4. **Job**: see alias, page count, settings, quote (never the filename or contact details), then Accept or Reject. After unlock, the secure viewer opens; the merchant prints and marks printed, then completed.

### Admin
Login, then **Overview** (pending count, active shops, jobs today), **Merchants queue**, **Review page** (see section Phase 6), **Plans**, **Audit log**.

---

## 9. UI style guide (3D, consistent)

**Fonts (strict):** Inter for body, labels, tables. Space Grotesk for headings, prices, big numbers. Load both with `next/font/google`, expose as `--font-body` and `--font-display`. No other typefaces anywhere, including inside maps and emails where possible. Use `font-variant-numeric: tabular-nums` for prices and counts.

**Colour tokens (CSS variables, light and dark; follow the system setting with a toggle):**

| Token | Light | Dark |
| --- | --- | --- |
| `--bg` | `#F5F2EA` | `#0E1726` |
| `--surface` | `#FBF9F3` | `#1A2B47` |
| `--surface-2` | `#EAE4D4` | `#16233A` |
| `--text` | `#14213D` | `#EAF0F7` |
| `--text-muted` | `#4A5568` | `#B3C0D4` |
| `--accent` (green) | `#12724A` for text, `#3DD68C` for fills | `#3DD68C` |
| `--warm` (amber) | `#B7791F` | `#FFB84D` |
| `--info` (blue) | `#3558A3` | `#5B8DEF` |
| `--danger` | `#B42318` | `#FF6B6B` |

Text on any fill must meet 4.5:1 contrast (3:1 for 44px+). Use dark text on the light green and amber fills. Never rely on colour alone: pair status colours with words.

**3D language (the "extruded paper" look from the pitch deck)**

- **Extruded surfaces:** cards and buttons use stacked hard shadows to fake thickness, plus one soft ambient shadow. Example:
  `box-shadow: 0 3px 0 var(--edge-1), 0 6px 0 var(--edge-2), 0 9px 0 var(--edge-3), 0 28px 48px rgba(0,0,0,.25);`
- **Button3D:** raised by default; on press it moves down (`translateY`) and the extrusion shrinks, giving a real press feel. Variants: primary (green), secondary (surface), danger.
- **Card3D:** pointer-tilt using CSS `perspective` and `rotateX/rotateY` (max about 6 degrees, smooth with `motion`). Disabled on touch devices and when `prefers-reduced-motion` is set.
- **Isometric illustrations:** inline SVG built from polygons (top, left, right faces in three shades). Used for the hero, empty states and the tree. No stock images, no external image URLs.
- **Depth layers:** subtle parallax between background shapes and foreground on the landing hero (CSS transforms only).
- **Optional 3D hero** (Phase 14): a small lazy-loaded `react-three-fiber` scene of the stacked paper layers, with the SVG as fallback. Skip it if it hurts mobile performance.
- **Radii:** cards 28px, buttons and inputs 16px, pills fully round.
- **Motion:** 150 to 300 ms, ease-out. Page transitions fade and rise. Always honour `prefers-reduced-motion`.

**Layout and components**

- Mobile first. Customer app has a bottom tab bar on mobile (Map, Vault, Jobs, Me). Merchant has a sidebar on desktop and a tab bar on mobile. Admin is a dense desktop-first layout with tables.
- Required shared components: `Button3D`, `Card3D`, `Input`, `Select`, `Switch3D` (the big Live toggle), `Modal`, `Sheet`, `Toast`, `Badge` (status), `Skeleton`, `EmptyState` (isometric art + helpful action), `Stepper`, `Table`, `FileDropzone`, `Timeline`.
- Every list has a **skeleton loader**, an **empty state** and an **error state** with retry.
- Forms validate inline with zod, keep focus order logical and show errors in text.
- Maps: full-bleed map with a **bottom sheet** on mobile and a **side panel** on desktop. Pins: green pulsing pin for live shops, grey for closed. Use custom `divIcon` markers (default Leaflet marker images break with bundlers). Always show the OpenStreetMap attribution. Provide a list view as a keyboard-accessible alternative to the map. In dark mode apply a CSS filter to the tile pane so tiles are not glaring.

---

## 10. Security and privacy design

1. **Authorization:** one `requireRole()` guard used in every server action and route handler. Merchants can only touch jobs of their own shop. Customers can only touch their own documents and jobs. Admins cannot read documents.
2. **Document storage:** upload to `incoming/` via presigned PUT; the server validates, encrypts (AES-256-GCM, per-document random key wrapped by `FILE_MASTER_KEY`), writes to `vault/`, deletes `incoming/`. Set a bucket lifecycle rule to delete `incoming/` after 1 day. Buckets are private. No presigned download URLs are ever given to merchants.
3. **Validation:** check file type by magic bytes (not just extension), size and page limits; reject encrypted or malformed PDFs with a clear message.
4. **Viewer:** the merchant browser only receives per-page watermarked images from `/api/viewer/[jobId]/page/[n]` with `Cache-Control: no-store`. The endpoint verifies role, shop ownership, job status, `unlocked_until`, and rate limits. The watermark (job id short code, shop id, timestamp) is composited with `sharp` at serve time. Every request writes a `view_logs` row.
5. **Deterrents on the viewer (be honest, these only deter):** disable right-click, drag and long-press on pages; block `Ctrl/Cmd+S` and `Ctrl/Cmd+P` except through our Print button; blank the pages when the tab loses focus; render pages to `<canvas>`. A print stylesheet outputs only the job's requested pages.
6. **Codes:** stored encrypted, compared in constant time, `PASSCODE_MAX_ATTEMPTS` wrong tries lock the job and notify the customer, who can regenerate a new code. Codes expire after `PASSCODE_TTL_MINUTES` in near mode.
7. **Identity:** customers appear as aliases. Merchant shop phone is shown to customers only if `show_phone` is on.
8. **SSRF protection** for the Google Maps link resolver: allowlist hosts, follow at most 5 redirects manually, 5 s timeout, GET only, no cookies, reject private or loopback IPs.
9. **Rate limiting** (DB-backed `rate_limits`) on OTP requests, code attempts, uploads, geo proxy and viewer pages.
10. **Headers:** strict CSP (allow only our origin, Razorpay checkout, the tile server and the geocoder as needed), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (geolocation only for self), HSTS in production.
11. **Logging:** structured logs with PII redaction. Never log document names, emails, phone numbers or codes.
12. **Retention:** documents expire (`expires_at`); inactive accounts' personal data is deleted after one year of inactivity (DPDP Rules, 2025 direction); a daily sweep deletes expired documents and stale `incoming/` leftovers.
13. **User rights:** a settings page lets customers export or delete their data and withdraw consent; deleting an account removes documents and anonymises job records while keeping payment records stripped of personal data.

---

## 11. Plans and limits

Plan rows live in `config/plans.ts` and are seeded by migration. The numbers below are **starting hypotheses** to validate with real shop owners; admins can edit them in `/admin/plans`.

**Merchant plans (per shop, per month, prices in ₹, stored as paise)**

| Plan | Price | Jobs / month | Unique customers / month | Extras |
| --- | --- | --- | --- | --- |
| Starter | 299 | 100 | 50 | 1 device |
| Growth | 599 | 500 | 250 | 2 devices, priority in the nearby list |
| Pro | 999 | 1500 | Unlimited | 5 staff logins, analytics |

- New approved shops get a **30-day trial on Growth limits**.
- When a cap is reached the shop shows *Not accepting new requests* to customers and the merchant sees an upgrade prompt.
- Counting uses the subscription period, not the calendar month.
- When a subscription lapses there is a 3-day grace period, then the shop is forced Offline.

**Customer plans**

| Plan | Price | Uploads / month | Vault size |
| --- | --- | --- | --- |
| Free | 0 | 10 | 100 MB |
| Plus | 49 | 100 | 2 GB |

---

## 12. Phases

Each phase lists **Goal**, **Tasks**, **Acceptance** and **Verify**. Do one phase at a time.

---

### Phase 0: Accounts and prerequisites (human only)

**Goal:** have every account and key ready so later phases never block.

**Human tasks**
1. Install Node.js LTS, pnpm and git. Create a GitHub repo `printsafe`.
2. **Neon:** create a project (pick the region nearest India; note the region for the privacy page). Create branches `main` (production), `dev` and `test`. Copy the pooled and direct connection strings.
3. **Email:** create a Brevo account (or other SMTP provider), verify a sender address, create SMTP credentials.
4. **Storage:** create a private bucket (Cloudflare R2 or similar). Create access keys. Add a CORS rule allowing `PUT` from your app origins. Add a lifecycle rule deleting objects under `incoming/` after 1 day.
5. **Razorpay:** create an account and use **Test Mode** keys. Later: webhook secret.
6. Generate secrets: `BETTER_AUTH_SECRET`, `FILE_MASTER_KEY` (32 random bytes, base64), `CRON_SECRET`, and VAPID keys.
7. Decide the real admin emails for `ADMIN_EMAILS`.

**Acceptance:** all values listed in section 5 are ready to paste into `.env.local` (not committed).

---

### Phase 1: Project scaffold

**Goal:** a clean, runnable Next.js project with strict tooling.

**Tasks**
1. `pnpm create next-app` with TypeScript, Tailwind, ESLint, App Router, `src/` directory.
2. Enable TypeScript `strict`. Add Prettier. Add scripts: `lint`, `typecheck`, `test`, `db:generate`, `db:migrate`.
3. Create the folder structure from section 4 with empty placeholder `index.ts` files only where needed (no fake content).
4. Add `src/lib/env.ts` (zod) validating env vars; the app must fail fast with a clear message when something is missing.
5. Add `.env.example`, `.gitignore` covering `.env*`, and a short `README.md` with setup steps.
6. Load **Inter** and **Space Grotesk** with `next/font/google`; apply `--font-body` to `body` and `--font-display` to `h1`-`h6`.
7. Add a minimal home page that only shows the PrintSafe name (the real landing comes in Phase 2).

**Acceptance:** `pnpm dev` runs; `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; both fonts render; missing env produces a readable error.

---

### Phase 2: Design system and 3D UI kit

**Goal:** reusable 3D components and the three app shells.

**Tasks**
1. Implement tokens from section 9 in `globals.css` (light and dark, system default plus manual toggle stored in a cookie).
2. Build `components/ui/*` listed in section 9. Add utility classes for extrusion (`.extrude-sm/md/lg`).
3. `Button3D` with press animation; `Card3D` with pointer tilt (disabled for touch and reduced motion); `Switch3D` as a large physical-looking toggle.
4. Build isometric SVG illustrations as components: paper stack, empty-state boxes, and a placeholder slot for the tree (real tree in Phase 14).
5. Build the three layouts: `CustomerShell` (bottom tabs on mobile), `MerchantShell` (sidebar), `AdminShell` (sidebar, dense). They are layouts only, with no data.
6. Build the **landing page** (`/`) with the 3D hero, problem, how-it-works in 3 steps, privacy promises, honest-limits note and the two CTAs (they link to `/signup` and `/merchant/signup`).
7. Add a `/dev/ui` page (development only, excluded in production) that shows every component in all states.

**Acceptance:** landing page matches the style guide in light and dark; keyboard focus is visible; components render in `/dev/ui`; no layout shift from fonts; Lighthouse accessibility 95 or higher.

**Verify:** lint, typecheck, build.

---

### Phase 3: Database (Neon + PostGIS + Drizzle)

**Goal:** the full schema running on Neon.

**Tasks**
1. Install `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`. Create `src/lib/db/client.ts` (pooled URL for runtime; use a pool or WebSocket client where transactions are needed) and `drizzle.config.ts` (unpooled URL for migrations).
2. Create a custom first migration enabling PostGIS.
3. Write schemas for every table in section 6 with enums, foreign keys and the required indexes (create the `geography` GiST index with raw SQL in a custom migration).
4. Add `config/plans.ts` and a migration that inserts the plan rows (reference data only).
5. Add helper queries: `findLiveShopsNear(lat, lng, radiusM)` using `ST_DWithin` on the geography cast and `ST_Distance` for sorting, and `isShopLive(shop, hours, subscription, now)`.
6. Run migrations against the Neon `dev` branch.

**Acceptance:** `pnpm db:migrate` succeeds on `dev`; all tables and indexes exist; the only rows in the database are plan rows; `isShopLive` is unit tested with real time scenarios (inside hours, outside hours, grace, expired).

---

### Phase 4: Authentication and roles

**Goal:** three separate logins, one secure auth backend.

**Tasks**
1. Install Better Auth with the Drizzle adapter and the Email OTP plugin. Wire `sendEmail()` (Nodemailer SMTP). Email templates use plain HTML with Inter-like system fallbacks and no remote images.
2. Add `role` and `alias` fields. Role is fixed at first sign-up through the entrance used: `/signup` creates `customer`, `/merchant/signup` creates `merchant`. An email already registered with one role cannot sign up with another (show a clear message).
3. **Admin bootstrap:** when a verified email appears in `ADMIN_EMAILS` and signs in at `/admin/login`, set `role = admin`. Admin sign-up is not possible any other way. No admin password exists.
4. Customer sign-up requires a consent checkbox (links to `/privacy`); store `consent_at` and the policy version.
5. Generate a unique alias (`Customer` + 4 random alphanumerics, collision-checked).
6. Add `requireRole()` helpers and middleware/proxy protection: `/app/*` customers only, `/merchant/*` merchants only (except login/signup), `/admin/*` admins only (except login).
7. Build the login and signup pages for the three entrances with the 3D style, an OTP entry step with resend cooldown, and error states.
8. Rate limit OTP sends (per email and per IP).

**Acceptance:** OTP arrives by email; signing up at the wrong entrance for an existing role is blocked; visiting another role's area redirects to its login; a non-listed email can never become admin; sessions are secure, HTTP-only cookies.

---

### Phase 5: Merchant registration and Google Maps link extraction

**Goal:** a merchant pastes a Google Maps link and the form fills as much as possible; the result goes to admin review.

**Tasks**
1. **Link parser** `lib/maps/parseGoogleLink.ts` (pure function, fully unit tested). Support these shapes: `google.com/maps/place/<NAME>/@lat,lng,...` (with `!3d<lat>!4d<lng>` in `data=`), `maps.google.com/?q=lat,lng`, `google.com/maps?q=...&ll=...`, `google.com/maps/search/...`, `?cid=`, and short links `maps.app.goo.gl/...` and `goo.gl/maps/...`.
   - Name: decode the path segment after `/place/` (`+` to space, `decodeURIComponent`).
   - Coordinates: prefer the `!3d`/`!4d` pair (the actual place pin) over `@lat,lng` (the map viewport centre); fall back to `q=` or `ll=`.
   - Feature id: capture the `0x...:0x...` value as `google_ftid` (it is **not** a Places API Place ID).
2. **Short-link resolver** `/api/maps/resolve` (server only, merchant role): follow redirects manually with the SSRF rules in section 10, then parse the final URL.
3. **Reverse geocode** via the server proxy `/api/geo/reverse` (Nominatim): derive address line, locality, city, state, pincode. Cache results in the database or memory. Respect Nominatim's usage policy: one request per second, a valid `User-Agent` from `GEO_USER_AGENT`, no bulk use.
4. **Optional enrichment** via Overpass: search within about 50 metres for OSM features that look like a copy shop (`shop=copyshop`, `craft=printer`, or a similar name) and read `phone`, `opening_hours`, `website`. Mark these as `source: osm`, `confidence: low`.
5. Return an `extraction` object where every field is `{ value, source: maps_url | nominatim | osm, confidence }`. **Do not scrape Google Maps HTML pages** (against Google's terms and unreliable). Name and coordinates come from the URL; address from reverse geocoding; phone, hours and prices come from the merchant.
6. **Optional, off by default:** a `GOOGLE_PLACES_API_KEY` feature flag for later use. Do not build it now.
7. Build the **onboarding wizard** (`/merchant/onboarding`, saved as `draft` after each step so progress is never lost):
   1. Paste link, press *Extract*, show a progress state and any failure with a clear message (such as "This link could not be read. Check that it is a Google Maps share link").
   2. Confirm the pin on a Leaflet map (draggable pin, search box) and edit prefilled fields, each showing a small source badge (*From link*, *From map data*, *You entered*).
   3. Services and per-page prices (B&W and colour, in rupees converted to paise), A3 and duplex options.
   4. Opening hours for each weekday and a *Follow this schedule automatically* switch.
   5. Shop contact phone (private by default, with a *Show to customers* switch), optional GSTIN, and storefront photo upload (JPG/PNG/WebP, max 5 MB, to private storage).
   - **Storage groundwork for this step:** create `lib/storage/client.ts` now with the S3 client and `presignPut`, `getObject`, `putObject`, `deleteObject` helpers (storefront photos go under `shops/<shopId>/`). The encryption layer for documents is added later in Phase 7.
8. On submit set `status = pending_review`, write an audit log, email the merchant a receipt, and notify admins. Show the **Pending** screen. If `changes_requested`, reopen the wizard with the admin's notes.
9. Duplicate guard: block a second shop with the same `google_ftid`, and warn when another shop with a similar name is within 30 metres.

**Acceptance:** parser unit tests pass for every link shape above (tests use sample URLs in test files only); a real Google share link fills name, pin and address; failures never crash the wizard; unapproved shops are never visible to customers; merchants cannot go Live yet.

---

### Phase 6: Admin dashboard and merchant verification

**Goal:** admins verify merchants and allow them to start business.

**Tasks**
1. `/admin` overview: counts of pending, approved, suspended shops; jobs today; no personal data.
2. `/admin/merchants`: filterable table by status with search and pagination, newest pending first.
3. `/admin/merchants/[id]` review page, laid out as two columns:
   - **Left:** what the merchant submitted (name, address, contact, services, prices, hours, GSTIN, storefront photo through a short-lived signed URL).
   - **Right:** a map with the pin and an *Open in Google Maps* link, the extraction report (each field with its source and confidence), and **automatic flags**: pin versus geocoded entered address distance above 300 m, possible duplicate, missing phone, no storefront photo.
   - A **verification checklist** (storefront matches name, pin is a real shop location, phone reachable, no duplicate), required notes for any decision other than approve, and buttons **Approve**, **Request changes**, **Reject**, plus **Suspend** and **Reinstate** for approved shops.
4. On **Approve**: set `status = approved`, `approved_at`, create a 30-day Growth trial subscription, email and notify the merchant (they can now go Live). Record a `shop_reviews` row and an audit log.
5. `/admin/plans`: view and edit plan prices and limits (writes audit logs). Changing a plan affects new purchases only.
6. `/admin/audit`: searchable audit log.
7. Admins never see documents, filenames, customer emails or phone numbers. Job views show only status, mode, sheet count and amounts.

**Acceptance:** only emails in `ADMIN_EMAILS` reach `/admin`; a merchant cannot approve themselves; each decision creates a review row, audit entry and a merchant notification; an approved shop becomes eligible to go live, a suspended shop is forced offline immediately.

---

### Phase 7: Secure document storage and vault

**Goal:** customers upload, preview and manage documents safely.

**Tasks**
1. `lib/storage/`: reuse the client and helpers from Phase 5 and add `crypto.ts` with envelope encryption (generate a random 32-byte data key per document, encrypt the key with `FILE_MASTER_KEY`, store as `wrapped_key`; blobs stored as `iv | authTag | ciphertext`).
2. Upload flow: `POST /api/uploads/init` (validates type, size, plan quota; creates a `documents` row in `processing`; returns a presigned PUT to `incoming/<id>`), the browser uploads directly, then `POST /api/uploads/finalize` which reads the object, checks magic bytes, counts pages (PDF) or converts an image to a one-page PDF with `pdf-lib`, enforces limits, encrypts, stores in `vault/`, deletes `incoming/`, sets `ready`.
3. Page rendering `lib/documents/render.ts`: `renderPage(documentId, pageNo)` uses `pdfjs-dist` + `@napi-rs/canvas` to render about 150 DPI, encodes WebP with `sharp`, encrypts and caches in `document_pages`. Keep it behind an interface so it can be swapped for `pdftoppm` in a Docker host later. Warm pages 1 to 3 at finalize.
4. Accept: PDF, JPG, PNG, WebP. Reject everything else with a friendly message that DOCX support is coming.
5. Vault UI `/app/vault`: dropzone with progress, grid of document cards (thumbnail from page 1, name, pages, size, expiry date), rename, delete, and per-document **print presets** (pages, copies, colour, sides, paper size) and **retention** (*Delete after printing* or keep for N days, default `DEFAULT_RETENTION_DAYS`). `/app/vault/[id]` shows page previews through an authenticated image route for the owner only.
6. Quotas: enforce Free-tier limits (uploads per month, total vault size) with clear messages and an upgrade nudge.
7. Hard delete removes the original, all page blobs and rows; show confirmation.

**Acceptance:** an uploaded PDF becomes `ready` with the right page count; files in the bucket are unreadable ciphertext; another user can never fetch someone's pages; deleting removes every blob; oversize and wrong-type files are rejected before encryption.

---

### Phase 8: Map and nearby shops (customer)

**Goal:** a proper free map for finding live shops.

**Tasks**
1. `components/map/ShopMap.tsx` with `react-leaflet`, loaded via `next/dynamic` with SSR disabled. Tile URL and attribution from env (default OpenStreetMap). Custom `divIcon` pins; user location marker; cluster pins if more than 30 shops are visible.
2. Location: use the browser Geolocation API after a clear explanation screen. If denied or unavailable, show a place search box backed by `/api/geo/search` (Nominatim, debounced, cached, rate limited) and remember the last chosen place locally.
3. Query: `GET /api/shops/nearby?lat&lng&radius` runs `findLiveShopsNear`, only `approved` shops with a valid subscription, returns name, distance, locality, prices, services, live state and capacity state. Never return owner details.
4. UI: map plus bottom sheet (mobile) or side panel (desktop) listing shops sorted by distance. Toggle *Show closed shops*. Tapping a shop opens a detail card with prices, services, hours, directions link (opens the default maps app via a standard `geo:` or OSM/Google directions URL) and **Request print**.
5. Live refresh by polling every 15 s while the tab is visible. Show an empty state when no shop is live nearby, with a *Notify me* prompt (wired in Phase 13).
6. Dark-mode tile filter and a keyboard-accessible list view.

**Acceptance:** works on mobile and desktop; correct attribution visible; nearest live shops appear first; a shop that goes offline disappears within about 15 s; no unapproved or offline shop is exposed by the API unless the toggle asks for closed ones; the geocoder proxy respects rate limits.

---

### Phase 9: Print requests (customer side)

**Goal:** customers create and track print jobs.

**Tasks**
1. `lib/jobs/quote.ts`: sheets = pages in range x copies, halved (rounded up) for double-sided; amount = per-page price (B&W or colour) x pages x copies. Pure functions with unit tests.
2. `lib/jobs/machine.ts`: the state machine from section 7 with guarded transitions, each returning a typed result, writing audit logs and notifications.
3. Request flow `/app/jobs/new?shop=&doc=`: choose document, confirm settings (prefilled from presets), see the quote, choose mode (*Walk in* is suggested if the shop is within `NEAR_DEFAULT_RADIUS_M`, else *Pay now, collect later*), send. The server recomputes the quote and checks that the shop is live and within its plan caps.
4. `/app/jobs`: list with status badges, and `/app/jobs/[id]`: timeline, live status via polling, cancel button before acceptance, the **handover code** (large, with a copy button) once accepted, a **Regenerate code** action if locked or expired, and a payment button for far mode (wired in Phase 12).
5. Expiry: requests unanswered after `REQUEST_EXPIRY_MINUTES` show as expired (computed on read; swept by cron in Phase 15).
6. The customer never sees merchant personal data beyond the shop's public details.

**Acceptance:** a job cannot be created against an offline, suspended or at-capacity shop; client-sent prices are ignored; illegal state transitions are rejected; the code is visible only to the job's customer.

---

### Phase 10: Merchant dashboard (live toggle, prices, queue)

**Goal:** merchants run their shop day to day.

**Tasks**
1. `/merchant` dashboard: big **Switch3D Live/Offline** (works only when approved and subscribed), today's jobs, pending count, plan usage meters (jobs and unique customers versus plan limits), and next steps while the shop is not yet approved.
2. Schedule settings: weekday hours and the *Follow schedule automatically* switch (live state computed as in section 6).
3. `/merchant/queue`: live-polling list (every 5 s while the tab is visible) of requests, newest first, with audible and visual alert on a new request.
4. `/merchant/jobs/[id]`: shows alias, mode, page count, settings, quote and status. **Never shows the filename or customer contact data.** Actions: **Accept** (generates the code), **Reject** (optional reason), and in near mode an **Enter customer code** field (3 attempts, then locked).
5. `/merchant/settings`: edit prices, services, phone visibility; changes to the name, location or GSTIN send the shop back to `pending_review`.
6. Plan caps: on reaching a cap, stop new requests and show an upgrade prompt linking to billing (Phase 12).

**Acceptance:** toggling Live updates the customer map within about 15 s; a merchant sees only their own shop's jobs; wrong codes lock the job after 3 tries; usage meters match real counts.

---

### Phase 11: Secure viewer and print

**Goal:** merchants view and print without ever holding the file.

**Tasks**
1. Unlock rules: near mode requires the correct code; far mode requires `paid`. Unlock sets `unlocked_until = now + VIEW_WINDOW_MINUTES`. A merchant may reopen while unprinted up to `MAX_REOPENS` times.
2. `GET /api/viewer/[jobId]/page/[n]`: verifies session, role, shop ownership, status, `unlocked_until`, page within the job's requested range, and rate limit; decrypts the cached page image (rendering lazily if missing); composites the watermark with `sharp`; responds with `Cache-Control: no-store` and `Content-Disposition: inline`; writes `view_logs`. Never returns the original file.
3. Viewer page `/merchant/jobs/[id]/view`: a clean fullscreen reader with a countdown for the viewing window, a **print instructions card** (copies, colour or B&W, single or double sided, paper size, because browsers cannot preset the print dialog), and a **Print** button that calls `window.print()`.
4. Print stylesheet: hide all UI, output only the requested pages in order, set `@page` size, apply `filter: grayscale(1)` for B&W jobs, keep a faint watermark.
5. Deterrents from section 10: no right-click, drag or long-press; block save and print shortcuts except via our button; blank pages when the tab loses focus; render with canvas.
6. **Mark printed** action: sets `printed`, ends access immediately (`unlocked_until = now`), and if the document has `delete_after_print`, deletes it and its cached pages from storage. Then **Mark completed** (cash received, or customer collected with code verified at handover in far mode).
7. Show the viewer a short notice: *This document is private. Viewing is logged. Do not photograph or copy it.*

**Acceptance:** without unlock the endpoint returns 403; after `unlocked_until` or `printed` it returns 403; no endpoint returns the original; every page view is logged; the printed output contains only the requested pages; `delete_after_print` removes storage objects.

---

### Phase 12: Payments (Razorpay) and plan limits

**Goal:** working payments in test mode, ready for live keys.

**Free to integrate** means no setup or AMC fee; Razorpay charges a per-transaction fee (about 2% plus GST at the time of writing, with promotional offers for new businesses). Verify current terms before launch.

**Tasks**
1. `lib/payments/razorpay.ts`: a thin client behind a `PaymentProvider` interface (`createOrder`, `verifyPayment`, `verifyWebhook`, `refund`). Amounts in paise.
2. **Merchant plan purchase** (`/merchant/billing`): create an order for the plan price, open Razorpay Checkout (`checkout.js`), then verify the signature server-side (HMAC SHA-256 of `order_id|payment_id` with the key secret). Activate a 30-day `shop_subscriptions` period. Upgrades charge the new plan price and start a new period. Send a renewal reminder email 3 days before expiry; apply the 3-day grace rule.
3. **Customer plan purchase** (Plus) the same way.
4. **Job payments (far mode):** after acceptance the customer pays the quote. Create the order server-side from the stored quote. Mark `paid` only after server verification **and** the webhook.
5. **Settlement to shops:** the preferred design is Razorpay **Route** (linked accounts, with transfers held until the job is printed). Route needs account activation and merchant KYC with Razorpay, so read the current Route docs first. If Route is not available yet, set `PAYMENT_MODE=direct_upi`: the merchant adds their own UPI ID, the customer pays them directly by UPI intent or QR, and the merchant confirms receipt. Keep this behind the provider interface and tell the human which mode is active.
6. **Webhook** `POST /api/payments/webhook`: verify `X-Razorpay-Signature` against the raw body with `RAZORPAY_WEBHOOK_SECRET`; store the event id in `webhook_events` for idempotency; handle `payment.captured`, `payment.failed`, `order.paid` and refund events.
7. **Refund rule:** a paid job that the shop never prints (shop goes offline, rejects after payment, or request expires) is refunded automatically; record every refund.
8. Plan-limit enforcement helpers (`canAcceptJob`, `canUpload`) used everywhere that creates jobs or uploads, with unit tests for boundary cases.
9. All payment screens show amounts in ₹ with tabular numbers and receipts the user can view.

**Acceptance:** test-mode payments succeed end to end for plans and jobs; a forged signature is rejected; replayed webhooks do nothing twice; limits block the 101st job on Starter; refunds are recorded; no card data ever touches our servers.

---

### Phase 13: Notifications

**Goal:** people hear about things that matter without sharing contact details.

**Tasks**
1. In-app notifications (bell with unread count, list page) for both roles and admins. Payloads contain ids and statuses only, no personal data.
2. Email for key events: OTP, merchant approved or rejected or changes requested, job accepted or rejected, plan expiring.
3. **Web Push:** `public/sw.js`, a `manifest.webmanifest` so customers can install the app (needed for push on iOS), VAPID keys, a `subscribe` flow with an explanation screen, and `web-push` sending.
4. **"Shop went live nearby":** customers can opt in to alerts for a saved area. Store only a **rounded location** (about 500 m grid) and a radius, show it to the user, let them delete it any time. When a shop goes live, notify opted-in customers within range, rate limited so nobody gets more than a few alerts a day.
5. Merchants get a push and sound on new requests.

**Acceptance:** opt-in and opt-out work; no notification payload contains an email, phone or filename; users with no subscription still see in-app notices; alerts respect the rate limit.

---

### Phase 14: Paper footprint tree and 3D polish

**Goal:** the signature creative feature and a final visual pass.

**Tasks**
1. `components/tree/FootprintTree.tsx`: an isometric SVG tree with 5 canopy tiers. Each `SHEETS_PER_CANOPY_TIER` sheets printed removes one tier (animated fall, then a log appears at the base); after 5 tiers the tree becomes a stump with logs, and a new sapling starts to grow beside it. This is a **playful visual scale**.
2. Text beside it shows the real figure honestly: *You have printed X sheets, roughly Y% of one tree (approximate)*, using `SHEETS_PER_TREE_APPROX`. Keep the word "approximate" and make the constant easy to change.
3. Update `sheets_printed_total` when a job reaches `completed`. Show the tree on the customer home and the job-complete screen, with a gentle nudge: *Sharing a PDF digitally saves paper.*
4. Add a short celebration animation when the customer has a month with no printing.
5. Optional: the lazy-loaded `react-three-fiber` hero scene on the landing page with SVG fallback. Keep the first load light.
6. Polish pass: consistent extrusion, spacing, empty states and skeletons on every screen, and `prefers-reduced-motion` support everywhere.

**Acceptance:** the tree reflects the real total and animates smoothly; no jank on a mid-range phone; reduced motion shows a static state; the UI uses only Inter and Space Grotesk.

---

### Phase 15: Privacy, compliance and security hardening

**Goal:** make the MVP responsibly shippable.

**Tasks**
1. `/privacy` and `/terms` pages written in plain language: what is collected, why, retention, who can see what, the honest limits of screenshot and Save-as-PDF protection, the data region, and how to exercise rights. Mark them *Draft: have a lawyer review before launch*.
2. Consent record and policy version stored at sign-up; re-prompt when the version changes.
3. Settings: **Export my data** (JSON) and **Delete my account** (removes documents and pages, anonymises job and payment records).
4. Daily `/api/cron/sweep` (protected by `CRON_SECRET`): delete expired documents and their blobs, delete leftover `incoming/` objects, expire stale requests, lapse subscriptions, remove personal data of accounts inactive for one year after a warning email.
5. Security headers and CSP per section 10; verify the CSP does not block Leaflet tiles, Razorpay Checkout or fonts.
6. Rate limits applied everywhere listed in section 10; add tests.
7. Dependency audit (`pnpm audit`), and a threat-model note in `docs/security.md` listing what the system can and cannot prevent.
8. Breach-response checklist in `docs/security.md` (who to notify, what to log).

**Acceptance:** export and delete work end to end; the sweep runs idempotently; CSP is enforced without console errors; a manual test of the viewer shows no way to fetch the original file.

---

### Phase 16: Testing and QA

**Goal:** confidence before real users.

**Tasks**
1. **Unit tests (Vitest):** Google link parser (all shapes), quote calculator, state machine transitions, `isShopLive`, plan limits, encryption round trip, code attempts and lockout, signature verification.
2. **End-to-end tests (Playwright)** against the Neon `test` branch with fixtures created inside the tests only:
   - Merchant signs up, submits, admin approves, merchant goes live.
   - Customer uploads, finds the shop, requests a print, merchant accepts, code unlock, view, print, complete (near mode).
   - Far mode with Razorpay test payment.
   - Authorization: customer cannot open merchant or admin pages; merchant cannot fetch another shop's job pages.
3. Manual QA on a real phone: geolocation, map usability, upload from camera roll, push.
4. Accessibility pass (keyboard, screen reader labels, contrast) and Lighthouse on key pages.

**Acceptance:** all tests pass in CI; no console errors on main flows; core web vitals are acceptable on mobile.

---

### Phase 17: Deployment and launch checklist

**Goal:** a live, monitored deployment.

**Tasks**
1. Deploy to Vercel (hackathon demo). Add all env vars; use the Neon `main` branch for production. For a commercial launch, move off the Hobby plan or to another host.
2. Configure the Razorpay webhook to the production URL; configure the daily Vercel Cron call to `/api/cron/sweep` with the secret.
3. Connect a custom domain and HTTPS; set `NEXT_PUBLIC_APP_URL`; confirm bucket CORS and lifecycle rules.
4. Decide the tile provider: keep OSM only for low traffic; otherwise switch `NEXT_PUBLIC_MAP_TILE_URL` to a provider's free tier or self-hosted tiles.
5. If PDF rendering fails on serverless, deploy the render step as a small Docker service using `pdftoppm`.
6. Add error monitoring with PII scrubbing (for example Sentry's free plan).
7. Final launch checklist (tick before going public):
   - [ ] Razorpay switched from test to live keys and webhook verified
   - [ ] Real admin emails set and tested
   - [ ] Privacy and terms reviewed by a lawyer
   - [ ] First 3 to 5 real shops onboarded in one pilot area through the real flow
   - [ ] Backup and restore tested on Neon (branching or point-in-time restore)
   - [ ] No dummy data in any database

---

## 13. Out of scope for this MVP (do not build yet)

- Desktop **Print Agent** that prints straight to the printer and blocks PDF printers
- DOCX/PPT conversion, document editing, multi-document jobs
- Native mobile apps, regional languages, shop ratings and reviews
- Auto-renewing subscriptions (UPI AutoPay or card mandates)
- Staff accounts and multi-branch shops
- Courier or home delivery

## 14. Definition of done for the MVP

A real merchant can register with a Google Maps link, get verified by an admin, go Live, and receive a request from a real customer who uploaded a document. The merchant views and prints it only through the locked viewer, the customer's contact details and file never reach the shop, payment works end to end in the chosen mode, and the paper tree updates. The database contains no dummy data.
