import React from "react";
import Link from "next/link";
import { Badge, Card3D, Button3D } from "@/components/ui";
import { ShieldCheck, Lock, EyeOff, FileText, ArrowLeft } from "lucide-react";

export default function PrivacyNoticePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 sm:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button3D variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
            </Button3D>
          </Link>
          <Badge variant="live" size="sm">
            Policy Version 1.0
          </Badge>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            PrintSafe Privacy Notice
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Draft: Subject to legal review before production launch.
          </p>
        </div>

        <Card3D className="space-y-6 text-sm leading-relaxed text-[var(--text-muted)]">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              1. Our Zero-Trust Commitment
            </h2>
            <p>
              PrintSafe was built to replace unencrypted document transmission
              (WhatsApp, unencrypted email, USB drives) to neighborhood Xerox
              and print shops. When you upload a document to PrintSafe, it is
              encrypted using envelope encryption (AES-256-GCM) with a unique
              per-document key.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              2. What Print Shops Can and Cannot See
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Cannot See:</strong> Your real name, personal phone
                number, WhatsApp account, or email address. You appear solely as
                an anonymous alias (e.g. <code>Customer A7F2</code>).
              </li>
              <li>
                <strong>Cannot Download:</strong> Print shops have no download
                endpoint or file access. They view pages solely through a
                locked, watermarked viewer for the duration of the print job.
              </li>
              <li>
                <strong>Can See:</strong> Page count, color/B&amp;W preference,
                duplex settings, and the watermarked page images while unlocked
                with your one-time passcode.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              3. Honest Limits of Web Technology
            </h2>
            <p>
              A web platform cannot physically prevent an operator from using a
              physical camera phone to photograph a screen or invoking a
              browser&apos;s &quot;Save as PDF&quot; action. PrintSafe minimizes
              risk by restricting viewing windows (30 minutes), rendering pages
              to canvas, applying dynamic visible forensic watermarks, and
              logging every page view.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#12724A] dark:text-[var(--accent)]" />
              4. Data Retention &amp; Deletion
            </h2>
            <p>
              You maintain total control over your documents. You can configure
              your vault to delete documents immediately after printing, or
              after a custom retention period. Hard deletion permanently deletes
              all ciphertext blobs and encryption keys.
            </p>
          </section>
        </Card3D>
      </div>
    </div>
  );
}
