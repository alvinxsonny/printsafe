import React from "react";
import Link from "next/link";
import { Badge, Card3D, Button3D } from "@/components/ui";
import {
  FileText,
  ShieldAlert,
  CreditCard,
  Scale,
  ArrowLeft,
  Store,
  Clock,
} from "lucide-react";
import { CURRENT_POLICY_VERSION } from "@/config/app";

export default function TermsOfServicePage() {
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
            <Link href="/privacy">
              <Button3D variant="outline" size="sm">
                Privacy Notice
              </Button3D>
            </Link>
            <Badge variant="live" size="sm">
              Terms v{CURRENT_POLICY_VERSION}
            </Badge>
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            PrintSafe Terms of Service
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Effective Date: November 2026 &bull; Region: India &bull; Version{" "}
            {CURRENT_POLICY_VERSION}
          </p>
        </div>

        <Card3D className="space-y-8 text-sm leading-relaxed text-[var(--text-muted)] p-6 sm:p-8">
          {/* 1. Purpose & Service Scope */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              1. Scope of the Platform
            </h2>
            <p>
              PrintSafe provides an intermediary zero-trust web technology
              platform facilitating secure document printing at verified
              neighborhood copy and print storefronts (&quot;Merchants&quot;)
              without exposing customers&apos; personal phone numbers, emails,
              or unencrypted files. PrintSafe does not own or operate print
              shops; printing services are fulfilled by independent merchants.
            </p>
          </section>

          {/* 2. Customer Responsibilities & Prohibited Content */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              2. Acceptable Use and Prohibited Content
            </h2>
            <p>
              You agree not to upload or attempt to print any material that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Violates Indian law, including counterfeit government currency,
                forged sovereign credentials, or classified state defense
                documents.
              </li>
              <li>
                Contains child sexual abuse material (CSAM), non-consensual
                intimate imagery, or hate speech inciting imminent violence.
              </li>
              <li>
                Contains malicious software, exploit payloads, or malicious
                embedded macros.
              </li>
            </ul>
            <p>
              Violations result in immediate account termination, deletion of
              vault documents, and notification to relevant law enforcement
              authorities.
            </p>
          </section>

          {/* 3. Merchant Operating Standards */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <Store className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              3. Merchant Operating Standards
            </h2>
            <p>
              Merchants approved to conduct business on PrintSafe covenant and
              agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Operate exclusively through the PrintSafe Locked Viewer.</li>
              <li>
                Strictly refrain from taking physical photographs of customer
                documents using smartphones, cameras, or external recording
                devices.
              </li>
              <li>
                Honor published per-page prices (in paise) without imposing
                hidden surcharges at counter handover.
              </li>
              <li>
                Hand over physical prints strictly upon verification of the
                customer&apos;s one-time 4-digit handover passcode.
              </li>
            </ul>
          </section>

          {/* 4. Payments, Pricing & Automatic Refunds */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              4. Pricing, Payments, and Automatic Refunds
            </h2>
            <p>
              All fees and quotes are calculated and displayed in Indian Rupees
              (₹) and stored internally in integer paise (₹1 = 100 paise).
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Near Mode (Walk-In):</strong> The customer generates a
                quote and pays cash directly to the merchant upon counter
                verification.
              </li>
              <li>
                <strong>Far Mode (Pay Online):</strong> Payment is processed
                securely via Razorpay prior to viewer unlocking.
              </li>
              <li>
                <strong>Automatic Refund Guarantee:</strong> If a paid print job
                is rejected by the merchant, expires unanswered, or the shop
                goes offline before printing, the paid amount is automatically
                refunded in full.
              </li>
            </ul>
          </section>

          {/* 5. Viewing Window & Ephemeral Access */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              5. Ephemeral Viewing Windows &amp; Retention
            </h2>
            <p>
              Merchant viewing sessions are constrained to a 30-minute access
              window following code verification. Once marked printed or upon
              expiry of the viewing window, access terminates permanently.
              Documents configured with &quot;Delete after printing&quot; are
              purged immediately from cloud storage.
            </p>
          </section>

          {/* 6. Honest Technical Limits */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              6. Limitation of Technical Liability
            </h2>
            <p>
              PrintSafe implements industry-leading defense-in-depth measures
              (dynamic watermarks, canvas rendering, focus-loss blanks, envelope
              encryption). However, you acknowledge the honest technological
              limitations of the World Wide Web: software cannot prevent a bad
              actor from physically pointing a phone camera at a screen or using
              native browser print-to-PDF functions. PrintSafe disclaims
              liability for malicious physical recordings executed outside the
              software sandbox.
            </p>
          </section>

          {/* 7. Governing Law */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              7. Governing Law &amp; Jurisdiction
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the
              laws of the Republic of India. Any disputes arising under or in
              connection with these Terms shall be subject to the exclusive
              jurisdiction of the courts of Bengaluru, Karnataka, India.
            </p>
          </section>
        </Card3D>
      </div>
    </div>
  );
}
