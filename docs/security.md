# PrintSafe: Security Architecture, Threat Model & Compliance

> Working name: **PrintSafe**. Tagline: _Print anywhere. Share nothing._
> Document: Security Architecture, Threat Model, Incident Response & DPDP Compliance Guide.

---

## 1. Threat Model: What PrintSafe Can and Cannot Prevent

### What PrintSafe Prevents (Our Security Guarantees)

1. **Unencrypted File Disclosures in Transit and Rest**:
   - Replaces unencrypted messaging (WhatsApp, cleartext email, USB flash drives).
   - Every file is encrypted using envelope encryption (**AES-256-GCM**) with an ephemeral 32-byte data encryption key wrapped by `FILE_MASTER_KEY`.
   - File objects in the cloud storage bucket are unreadable ciphertext blobs (`iv | authTag | ciphertext`).

2. **Merchant Permanent File Retention & Unauthorized Copies**:
   - Zero file download endpoints exist for merchants.
   - Merchants never receive the original document or PDF.
   - Watermarked WebP page images are rendered dynamically in memory, streamed with `Cache-Control: no-store` and `Content-Disposition: inline`, and decrypted only during active, authorized viewing sessions.
   - Viewing sessions expire after `VIEW_WINDOW_MINUTES` (30 minutes).
   - Documents with `delete_after_print: true` are immediately hard-deleted from storage when marked printed.

3. **Customer Identity & Contact Information Harvesting**:
   - Print shops never see customer phone numbers or email addresses.
   - Customers interact strictly via randomized aliases (e.g. `Customer A7F2`).
   - Push notifications and in-app payloads contain only anonymous entity IDs, statuses, and counts; zero PII is ever broadcast.

4. **Location Surveillance & Movement Profiling**:
   - Customers opting into "Shop went live nearby" notifications have their coordinates snapped to a coarse ~500m grid cell (`roundCoordinateToGrid(coord, 0.005)`). Exact pins, street addresses, and device coordinates are never persisted.

5. **Server-Side Request Forgery (SSRF) & Injection**:
   - Google Maps link resolver validates target host allowlists (`maps.app.goo.gl`, `goo.gl/maps`, `google.com/maps`), limits redirects to 5, blocks private/loopback IP ranges, restricts requests to 5-second timeouts, and issues GET-only requests without cookies.

---

### Honest Technological Limits (What Software Cannot Prevent)

In accordance with our core design principles and plain-language notices:

1. **Physical Screen Photography**:
   - Software running in a browser cannot physically stop a person from using a smartphone camera to take a photo of a computer display.
   - _Mitigation_: Dynamic forensic watermarks (short job code, operator/shop ID, timestamp) composited across every page; canvas rendering; focus-loss blanking.

2. **Browser Native "Save as PDF" / Screenshot Utilities**:
   - A web browser operating in user-space cannot completely disable operating system screenshot tools (e.g., Windows Snipping Tool, macOS `Cmd+Shift+4`) or the browser system print dialog's "Save as PDF" destination.
   - _Mitigation_: Print stylesheets strictly constrain print media queries; print window shortcut overrides (`Ctrl+P`, `Cmd+P`, `Ctrl+S`, `Cmd+S`); a planned desktop _Print Agent_ will close this gap in future enterprise releases.

---

## 2. Security Architecture & Controls

### 1. Data Ingestion & Storage Isolation

- Direct-to-storage presigned uploads (`PUT incoming/<id>`) prevent web worker memory saturation.
- Server-side finalization checks PDF magic bytes (`%PDF`), verifies image dimensions, counts pages, encrypts with AES-256-GCM, stores in `vault/<id>`, and deletes `incoming/` immediately.
- Bucket lifecycle rules automatically purge unfinalized `incoming/` objects after 24 hours.

### 2. Multi-Tier Rate Limiting

Backed by PostgreSQL `rate_limits` table:

- **OTP Send**: Max 3 requests per 10 minutes per email; max 10 requests per 10 minutes per IP.
- **Passcode Verification**: Max 10 attempts per 5 minutes per job; 3 incorrect attempts locks the job.
- **Document Uploads**: Max 20 uploads per 10 minutes per user.
- **Geo / Nominatim Proxy**: Max 30 requests per minute per IP.
- **Viewer Page Streaming**: Max 60 page loads per 5 minutes per session.

### 3. Strict Content Security Policy (CSP) & Security Headers

Configured in `next.config.ts`:

- `Content-Security-Policy`: Restricts scripts, styles, frames, and connections strictly to our origin, Razorpay Checkout (`checkout.razorpay.com`, `api.razorpay.com`), OpenStreetMap tile servers (`*.tile.openstreetmap.org`), and Cloudflare R2 storage.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

---

## 3. Incident Response & Breach-Response Checklist (DPDP & CERT-In)

Under the **Digital Personal Data Protection (DPDP) Act, 2023** and **CERT-In Cyber Security Directions (2022)**, any cybersecurity incident or personal data breach must follow this strict response protocol:

### Phase 1: Detection & Triage (Hour 0)

1. **Identify Incident Severity**:
   - Severe: Unauthorized database access, compromise of `FILE_MASTER_KEY`, or bulk credential exposure.
   - Moderate: DDoS attack, single account compromise, or rate limit bypass attempt.
2. **Immediate Isolation & Containment**:
   - Rotate `FILE_MASTER_KEY` and database pool credentials immediately if key leakage is suspected.
   - Invalidate all active sessions in `sessions` table.
   - Revoke compromised S3/R2 presigned upload credentials.

### Phase 2: Regulatory Reporting (Within 6 Hours)

- [ ] **CERT-In Mandatory Reporting**: Report cybersecurity incident to CERT-In (Indian Computer Emergency Response Team) at `incident@cert-in.org.in` or via CERT-In portal within **6 hours** of noticing.
- [ ] **Data Protection Board of India (DPBI)**: File personal data breach notification detailing nature of breach, categories of affected users, estimated impact, and containment measures taken.

### Phase 3: Forensic Audit & Evidence Preservation

- [ ] Freeze PostgreSQL Neon branch / database snapshot for forensic audit.
- [ ] Review `audit_logs` table for actor IDs, entity IDs, timestamps, and suspicious IP addresses.
- [ ] Verify that no unencrypted customer files were exposed (confirm ciphertext integrity).

### Phase 4: User Notification & Remediation

- [ ] Notify affected customers via transactional email without including sensitive document details.
- [ ] Recommend passwordless re-verification or security steps.
- [ ] Publish an honest post-mortem incident report.

---

## 4. Dependency Security Audit Summary

- Production dependencies (`pnpm audit --prod`) verified for core crypto, storage, payments, and authentication packages.
- All database queries utilize parameterized SQL and Drizzle ORM to eliminate SQL injection vulnerabilities.
- Cryptographic primitives utilize native Node.js `crypto` with hardware-accelerated AES-NI.
