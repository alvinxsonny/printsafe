import React from "react";
import Link from "next/link";
import { Badge, Card3D, Button3D } from "@/components/ui";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  FileText,
  ArrowLeft,
  Server,
  Trash2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { CURRENT_POLICY_VERSION } from "@/config/app";

export default function PrivacyNoticePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 sm:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button3D variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
            </Button3D>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/terms">
              <Button3D variant="outline" size="sm">
                Terms of Service
              </Button3D>
            </Link>
            <Badge variant="live" size="sm">
              Policy v{CURRENT_POLICY_VERSION}
            </Badge>
          </div>
        </div>

        {/* Legal Review Warning Banner (Task 1) */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Draft: Have a lawyer review before launch
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed">
              This privacy notice outlines PrintSafe&apos;s zero-trust
              architecture, data protection principles, and compliance roadmap
              under the Digital Personal Data Protection (DPDP) Act, 2023. It is
              a draft specification subject to final legal counsel
              certification.
            </p>
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            PrintSafe Privacy Notice
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Effective Date: November 2026 &bull; Region: India (Asia-South)
            &bull; Version {CURRENT_POLICY_VERSION}
          </p>
        </div>

        <Card3D className="space-y-8 text-sm leading-relaxed text-[var(--text-muted)] p-6 sm:p-8">
          {/* Section 1: Zero-Trust Overview */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              1. Zero-Trust Document Architecture
            </h2>
            <p>
              Traditional neighborhood Xerox shops require customers to share
              unencrypted files and personal identifiers over messaging apps or
              email, resulting in permanent copies left on shop hard drives.
              PrintSafe replaces this broken paradigm with zero-trust envelope
              encryption (AES-256-GCM), volatile viewing windows, and automated
              purges.
            </p>
          </section>

          {/* Section 2: What is Collected and Why */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              2. What We Collect and Why
            </h2>
            <div className="space-y-2">
              <p>
                We adhere strictly to the DPDP principle of{" "}
                <em>data minimisation</em>. We only collect data strictly
                necessary to facilitate your print jobs:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Contact Information:</strong> Your email address is
                  collected solely for one-time passcode (OTP) authentication,
                  receipt delivery, and critical security notices. We never
                  sell, share, or monetize email addresses.
                </li>
                <li>
                  <strong>Anonymous Aliases:</strong> When you register, the
                  system assigns you a random alias (e.g.{" "}
                  <code>Customer A7F2</code>). Merchants interact exclusively
                  with this alias.
                </li>
                <li>
                  <strong>Uploaded Documents:</strong> Encrypted in transit and
                  at rest with a unique AES-256-GCM data encryption key.
                  Original filenames and content are never logged.
                </li>
                <li>
                  <strong>Location Data:</strong> To notify you when a nearby
                  storefront opens, customers may opt in to alert areas. To
                  prevent tracking, coordinates are snapped to a coarse ~500m
                  grid block before storage. Your exact pin or address is never
                  recorded.
                </li>
                <li>
                  <strong>Transaction &amp; Billing Data:</strong> Order IDs and
                  amounts in paise processed via Razorpay. We never store credit
                  card numbers or bank credentials.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: Who Can See What */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              3. Who Can See What (Strict Role Isolation)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-[var(--border)] rounded-xl overflow-hidden">
                <thead className="bg-[var(--surface-2)] text-[var(--text)]">
                  <tr>
                    <th className="p-3 text-left">Role</th>
                    <th className="p-3 text-left">What They Can See</th>
                    <th className="p-3 text-left">What They CANNOT See</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <tr>
                    <td className="p-3 font-bold text-[var(--text)]">
                      Customer
                    </td>
                    <td className="p-3">
                      Their vault documents, print presets, quotes, handover
                      passcode, and nearby live shop details.
                    </td>
                    <td className="p-3">
                      Merchant personal phone numbers (unless merchant enabled
                      public display), other customer jobs.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[var(--text)]">
                      Merchant
                    </td>
                    <td className="p-3">
                      Customer alias, requested print settings, page count, and
                      watermarked pages inside the locked viewer during the
                      viewing window.
                    </td>
                    <td className="p-3 font-bold text-red-500">
                      Original file, download buttons, customer email, customer
                      phone number, or permanent file storage.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[var(--text)]">Admin</td>
                    <td className="p-3">
                      Shop verification documents, plan pricing, platform usage
                      counts, audit event logs.
                    </td>
                    <td className="p-3 font-bold text-red-500">
                      Customer documents, decrypted files, customer email
                      identities in job views.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: Honest Limits */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              4. Honest Limits of Screenshot and Save-as-PDF Protection
            </h2>
            <p>
              Honesty is central to PrintSafe. A web application cannot
              physically prevent:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                A person using a secondary device (such as a smartphone camera)
                to photograph a screen.
              </li>
              <li>
                An operating system-level desktop screenshot tool or browser
                &quot;Save as PDF&quot; dialog option.
              </li>
            </ul>
            <p>
              PrintSafe mitigates these risks by making illicit copying
              difficult, traceable, and short-lived: viewing sessions expire
              after 30 minutes, right-click and keyboard shortcuts are deterred,
              canvas elements blank out on focus loss, and dynamic forensic
              watermarks imprint the operator ID, job ID, and timestamp onto
              every viewed page.
            </p>
          </section>

          {/* Section 5: Data Region */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <Server className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              5. Data Region &amp; Sovereignty
            </h2>
            <p>
              All primary application databases (Neon PostgreSQL), cryptographic
              keys, and object storage buckets (Cloudflare R2) reside within the{" "}
              <strong>Asia-South / India region</strong> to comply with Indian
              data localization standards and minimize latency.
            </p>
          </section>

          {/* Section 6: Data Retention & Automated Sweeps */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              6. Data Retention &amp; Automated Sweeps
            </h2>
            <p>Customer files do not linger on PrintSafe indefinitely:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Immediate Deletion:</strong> If &quot;Delete after
                printing&quot; is selected, files and rendered page caches are
                purged from storage the moment the job is marked printed.
              </li>
              <li>
                <strong>Daily Sweeps:</strong> A daily cron worker permanently
                sweeps expired documents, cleans up abandoned uploads older than
                24 hours, and expires abandoned jobs.
              </li>
              <li>
                <strong>Account Inactivity:</strong> In accordance with DPDP
                Rules guidance, accounts inactive for one year are permanently
                anonymized after a 30-day advance notice.
              </li>
            </ul>
          </section>

          {/* Section 7: User Rights */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              7. How to Exercise Your Rights
            </h2>
            <p>
              Under the DPDP Act 2023, you hold the right to access, export, and
              erase your personal data at any time:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Export My Data:</strong> Navigate to your{" "}
                <Link
                  href="/app/settings"
                  className="font-bold text-[var(--accent)] underline"
                >
                  Settings page
                </Link>{" "}
                to download an instant machine-readable JSON archive of your
                profile, jobs, and notifications.
              </li>
              <li>
                <strong>Delete My Account:</strong> Selecting &quot;Delete
                Account&quot; permanently destroys all vault documents, page
                caches, and credentials, while completely anonymizing historical
                merchant transaction receipts.
              </li>
              <li>
                <strong>Contact Grievance Officer:</strong> For privacy
                inquiries or consent withdrawals, contact our Data Protection
                Officer at{" "}
                <a
                  href="mailto:dpo@printsafe.local"
                  className="font-bold text-[var(--accent)] underline"
                >
                  dpo@printsafe.local
                </a>
                .
              </li>
            </ul>
          </section>
        </Card3D>
      </div>
    </div>
  );
}
