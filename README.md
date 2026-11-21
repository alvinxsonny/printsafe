# PrintSafe

> Print anywhere. Share nothing.

A zero-trust printing platform protecting user document privacy at Xerox and print shops.

## Prerequisites

- Node.js LTS (>= 20)
- pnpm (>= 9)
- Neon PostgreSQL database with PostGIS support
- Resend or SMTP provider credentials
- Cloudflare R2 or S3-compatible private storage bucket
- Razorpay account (Test mode)

## Setup

1. Clone the repository and install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the example environment file and fill in your credentials:

   ```bash
   cp .env.example .env.local
   ```

3. Run the development server:

   ```bash
   pnpm dev
   ```

4. Quality checks:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```
