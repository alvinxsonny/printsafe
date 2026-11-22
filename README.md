# PrintSafe 🛡️🖨️
> **Print anywhere. Share nothing.**  
> A Zero-Trust Printing Network and Ephemeral Document Vault engineered to eliminate data leakage at public print shops.

---

## 🚨 The Problem: The "Download Folder" Epidemic

Every day, millions of people visit local print shops, cyber cafés, and Xerox kiosks to print sensitive documents:
- National identity cards (Aadhaar, Passport, PAN, Driver's Licenses)
- Income tax returns and bank statements
- Medical diagnoses and lab reports
- Confidential legal agreements and employment contracts

To print them, people routinely **email them, AirDrop them, or send them over WhatsApp** to an operator's public PC. 

The terrifying reality? Those files remain indefinitely in:
1. The operator's unmonitored **Downloads** folder
2. Browser cache and WhatsApp desktop media databases
3. Email trash and temporary scratch disks

Anyone sitting at that computer next can search, copy, or steal your most intimate identity and financial records. **Identity theft, financial fraud, and unauthorized document reselling often begin right here.**

---

## 💡 The Solution: PrintSafe Zero-Trust Architecture

**PrintSafe** eliminates digital footprints at print terminals through an end-to-end zero-trust architecture. Customers never share their raw files, never open their personal accounts on shared terminals, and never leave copies behind.

```
+-------------------+       6-Digit Ephemeral OTP       +----------------------+
|  Customer Vault   | --------------------------------> |  Merchant Terminal   |
| (Cloudflare R2 +  |                                   | (Lockdown Browser)   |
|  Client Control)  |                                   |                      |
+-------------------+                                   +----------------------+
          |                                                         |
          | Encrypted Vector Stream                                 | In-Memory PDF.js
          v                                                         v
+------------------------------------------------------------------------------+
| Watermarked Vector Inspector (Canvas Sandbox, Anti-PDF-Export, Auto-Wipe)    |
+------------------------------------------------------------------------------+
                                          |
                                          v
                               [ Physical Paper Only ]
```

---

## 🔒 Core Security Pillars

### 1. 🗄️ Private Customer Vault
- Files are encrypted and uploaded directly into private **Cloudflare R2** object storage via short-lived presigned URLs.
- Raw files are never exposed publicly or indexed.

### 2. 🔑 Ephemeral One-Time Passcodes (OTPs)
- When at the kiosk, the customer generates a temporary **6-digit print passcode** with a configurable countdown timer (e.g., 5 or 10 minutes).
- The passcode authorizes access to **only** the selected document for that single print transaction.

### 3. 👁️ Zero-Download Watermarked Vector Inspector
- The shop operator enters the 6-digit code on their terminal to open the document viewer.
- The file is rendered directly inside browser memory using a high-fidelity **PDF.js vector engine** (100% zoom and vector crispness) without downloading the underlying PDF file to disk.
- High-visibility, dynamic diagonal watermarks displaying the **Merchant ID, Session ID, and Timestamp** are drawn across every page canvas to deter phone photography.

### 4. 🧼 Cryptographic Auto-Wipe
- The moment the print command is executed (or when the timer runs out or the session is cancelled), decrypted bytes are aggressively purged from the browser's memory and the session is permanently invalidated.
- Zero leftover files in `Downloads`, zero persistent disk cache.

### 5. 🖥️ Terminal Lockdown Scripts
- To prevent operators from quietly using browser "Print to PDF" or virtual drivers to create rogue digital copies, PrintSafe provides automated terminal lockdown policies for **Windows** (Registry policy) and **macOS** (Managed Preferences `.plist`):
  - Sets `DisablePrintToPDF = true`
  - Sets `PrinterTypeDenyList = ["pdf"]`
- Merchants complete this lockdown during onboarding before receiving live customer requests.

### 6. 🗺️ Geolocation Discovery & Merchant Hub
- Interactive **OpenStreetMap** with real-time GPS radius search allows customers to locate nearby certified PrintSafe kiosks.
- Integrated **Razorpay** billing supports subscription tiers and per-page merchant wallet top-ups.

---

## 🛠️ Tech Stack

| Domain | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Route Handlers) |
| **Frontend** | [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Database** | [Neon](https://neon.tech/) Serverless PostgreSQL |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) & Drizzle Kit |
| **Storage** | [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (S3-compatible private object storage) |
| **Document Engine** | [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) (Vector canvas rendering & client-side worker) |
| **Authentication** | Passwordless Magic Code / Email OTP via [Resend](https://resend.com/) |
| **Payments** | [Razorpay](https://razorpay.com/) Payment Gateway & Subscriptions |
| **Maps & Geospatial** | [Leaflet](https://leafletjs.com/) & [OpenStreetMap](https://www.openstreetmap.org/) |
| **Testing** | [Vitest](https://vitest.dev/) (160+ unit and integration test suite) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js LTS (`>= 20.x`)
- `pnpm` (`>= 9.x`)
- Neon PostgreSQL connection string
- Cloudflare R2 credentials (Access Key, Secret Key, Bucket Name, Account ID)
- Resend API Key
- Razorpay Test Key & Secret

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/print_safe.git
   cd print_safe
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your credentials in `.env.local`:
   ```env
   DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/printsafe?sslmode=require"
   R2_ACCOUNT_ID="your-cloudflare-account-id"
   R2_ACCESS_KEY_ID="your-r2-access-key"
   R2_SECRET_ACCESS_KEY="your-r2-secret-key"
   R2_BUCKET_NAME="printsafe-vault"
   RESEND_API_KEY="re_123456789"
   RAZORPAY_KEY_ID="rzp_test_xxxxxx"
   RAZORPAY_KEY_SECRET="your-razorpay-secret"
   ```

4. **Initialize Database Schema & Seeds:**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

5. **Start Development Server:**
   ```bash
   pnpm dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Quality Checks

Run the automated test suite and type safety checks:

```bash
# Run Unit & Integration Tests (160+ tests)
pnpm test

# Run TypeScript Validation
pnpm typecheck

# Run ESLint Analysis
pnpm lint

# Build for Production
pnpm build
```

---

## 🏆 Hackathon Recognition

PrintSafe was conceptualized, designed, and built during the **Orbix - 48-Hour Global Open Innovation Hackathon** hosted by **MnM**.

Special thanks to the **MnM** team and mentors for organizing an incredible event championing privacy-first digital public infrastructure!

---

## 📸 Application Preview

![PrintSafe Application Screenshot](./public/SCR-20261122-nqja.jpeg)
