# PrintSafe: Testing, QA & Accessibility Verification (Phase 16)

This document provides a comprehensive record of test coverage, test automation execution, manual QA procedures, and accessibility compliance for the PrintSafe zero-trust printing platform.

---

## 1. Automated Test Suite Summary

### 1.1 Unit Tests (Vitest)

- **Framework:** Vitest 3.2.7
- **Results:** **152 tests passing** across **19 test suites** (0 failures, 0 skipped)
- **Execution Speed:** ~1.2 seconds

| Test Suite                    | File                                   | Tests | Key Focus Areas                                                                                                                                                                                                                                                 |
| :---------------------------- | :------------------------------------- | :---: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **State Machine Transitions** | `tests/unit/stateMachine.test.ts`      |  22   | Near & Far mode transitions (`accept`, `pay`, `unlock`, `mark_printed`, `complete`, `reject`, `cancel`, `regenerate_code`, `expire`), refunds on paid cancellations/rejections, auto-delete trigger, footprint counter increment, invalid transition rejections |
| **Google Link Parser**        | `tests/unit/parseGoogleLink.test.ts`   |  10   | Place URLs, viewport `@lat,lng`, pin coordinates (`!3d/!4d`), short links (`maps.app.goo.gl`, `goo.gl/maps`), feature IDs (`0x...:0x...`)                                                                                                                       |
| **Quote Calculator**          | `tests/unit/quote.test.ts`             |   9   | B&W vs Color rates, duplex sheet calculation, single/multiple copy multipliers, rounding & minimum charge rules                                                                                                                                                 |
| **Shop Live Logic**           | `tests/unit/isShopLive.test.ts`        |   9   | Business hours windows, day-of-week boundaries, active subscription check, grace periods, manual override toggle                                                                                                                                                |
| **Passcode Handover**         | `tests/unit/passcode.test.ts`          |   4   | 4-digit numeric generation, AES-256-GCM encryption/decryption roundtrip, constant-time verification, 10-minute unanswered expiry                                                                                                                                |
| **Merchant Operations**       | `tests/unit/merchantDashboard.test.ts` |  10   | 3-attempt lockout mechanics, state persistence, unlock window limits, live status checks                                                                                                                                                                        |
| **Payments & Plan Limits**    | `tests/unit/payments.test.ts`          |  12   | Starter plan monthly cap (100 jobs), Pro/Business tier limits, Razorpay HMAC-SHA256 signature verification, webhook idempotency                                                                                                                                 |
| **Document Vault**            | `tests/unit/documents.test.ts`         |  12   | Magic byte inspection (PDF, PNG, JPEG, WebP), executable/script rejection, image-to-A4 conversion, quota validation                                                                                                                                             |
| **Encryption Round-Trip**     | `tests/unit/crypto.test.ts`            |   5   | Master key envelope encryption, IV generation, GCM authentication tag verification, tampering detection                                                                                                                                                         |
| **Secure Viewer & Watermark** | `tests/unit/secureViewer.test.ts`      |   8   | Sharp SVG watermark overlay compositing, diagonal pattern generator, tamper detection, viewer session state                                                                                                                                                     |
| **Paper Footprint Tree**      | `tests/unit/footprint.test.ts`         |  12   | Canopy tier calculation (5 tiers, 500 sheets each), stump & logs state, tree percentage calculation, honest phrasing                                                                                                                                            |
| **Notifications & Push**      | `tests/unit/notifications.test.ts`     |   8   | 500m coordinate grid snapping (DPDP privacy), Haversine metric distance, VAPID key conversion, payload PII sanitization                                                                                                                                         |
| **Security & Rate Limits**    | `tests/unit/security.test.ts`          |  10   | DB-backed sliding window rate limits, key prefixes, IP & email quotas, lockout escalation                                                                                                                                                                       |
| **Nearby Shops & PostGIS**    | `tests/unit/shopsNearby.test.ts`       |   6   | Spatial ordering, radius thresholding, verified shop filtering                                                                                                                                                                                                  |
| **Admin Review Rules**        | `tests/unit/adminReview.test.ts`       |   5   | Self-approval prevention, mandatory review notes on rejection/changes requested                                                                                                                                                                                 |
| **URL Resolver & SSRF**       | `tests/unit/resolveUrl.test.ts`        |   5   | Private IP blocking (RFC 1918), loopback blocking, redirect tracking                                                                                                                                                                                            |
| **Alias Generator**           | `tests/unit/alias.test.ts`             |   1   | `Customer` + 4 alphanumeric character format, collision protection                                                                                                                                                                                              |
| **Auth System**               | `tests/unit/auth.test.ts`              |   2   | Session validation, role-based access helpers                                                                                                                                                                                                                   |
| **Environment Config**        | `tests/unit/env.test.ts`               |   2   | Schema validation, fail-fast on missing secrets                                                                                                                                                                                                                 |

---

### 1.2 End-to-End Tests (Playwright)

- **Framework:** Playwright 1.65.1
- **Browsers Tested:** Desktop Chrome (`Desktop Chrome` channel), Mobile Emulation (`Pixel 7` channel)
- **Results:** **18 tests passing** (Desktop Chrome) & **18 tests passing** (Mobile Chrome)

| Spec File                              | Test Cases | Status |
| :------------------------------------- | :--------- | :----: |
| `tests/e2e/auth-guards.spec.ts`        | 8          |  Pass  |
| `tests/e2e/admin-verification.spec.ts` | 3          |  Pass  |
| `tests/e2e/near-mode.spec.ts`          | 4          |  Pass  |
| `tests/e2e/far-mode.spec.ts`           | 3          |  Pass  |

---

## 2. Manual QA Verification Checklist (Real Device)

| Flow                       | Test Case                                                   | Expected Behavior                                                                                                | Verification Status |
| :------------------------- | :---------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :-----------------: |
| **PWA Installation**       | Add to Home Screen on iOS (Safari) and Android (Chrome)     | Manifest loads icons, standalone display mode active, splash screen renders correctly                            |      Verified       |
| **Geolocation**            | Customer taps "Locate Me" on map                            | Browser prompts for location; snaps map viewport to current coordinates with accuracy ring                       |      Verified       |
| **Map Usability**          | Touch panning, pinch-to-zoom on Leaflet                     | Smooth tile streaming, shop pins tap-responsive, modal drawer opens cleanly on mobile                            |      Verified       |
| **Camera Roll Upload**     | Tap "Upload Document" -> Select from Camera / Photo Library | JPEG/PNG uploads, client validates file size <= 25MB, server converts to single/multi-page A4 PDF                |      Verified       |
| **Near Mode Handover**     | Customer arrives at shop, shows 4-digit code                | Merchant enters code on `/merchant/jobs/[id]`, reader unlocks with 15-minute countdown                           |      Verified       |
| **Secure Print Viewer**    | Merchant views document on desktop / mobile                 | Right-click blocked, print CSS forces watermarks, Save-as-PDF shows legal warning, original PDF never downloaded |      Verified       |
| **Web Push Alerts**        | Job accepted / live shop nearby alert                       | Push notification banner triggers native sound and vibration; tapping opens job tracker                          |      Verified       |
| **Paper Tree Celebration** | Customer completes job or has zero-print month              | Footprint tree tiers animate smoothly; celebration confetti triggers without jank                                |      Verified       |

---

## 3. Accessibility & WCAG 2.1 AA Audit

| Area                        | Requirement                                             | Implementation Detail                                                                                                                     |
| :-------------------------- | :------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Keyboard Navigation**     | Visible focus rings on all interactive elements         | Global CSS `:focus-visible` styles with high-contrast outlines; skip links to main content                                                |
| **Screen Reader Landmarks** | Semantic HTML5 structure                                | `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<section>` landmarks on all app shells                                             |
| **ARIA Attributes**         | Accessible names & status announcements                 | Modals use `role="dialog"` with `aria-modal="true"`; buttons have accessible labels or `aria-label`; live regions announce status changes |
| **Color Contrast**          | Minimum 4.5:1 ratio for normal text, 3:1 for large text | Palette tokens (Emerald `#12724A`, Ink `#14213D`, Sand `#F5F2EA`) meet or exceed WCAG AA in both Light and Dark themes                    |
| **Reduced Motion**          | Honor `prefers-reduced-motion`                          | 3D tilts, extrusions, floating animations, and tree drop transitions are disabled or set to instantaneous transitions                     |
| **Font Readability**        | Consistent typography without layout shift              | Headings use Space Grotesk (`font-display`), body uses Inter (`font-body`), with `tabular-nums` for all currency amounts                  |
