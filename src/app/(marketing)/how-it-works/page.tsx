import React from "react";
import Link from "next/link";
import { Badge, Card3D, Button3D } from "@/components/ui";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  MapPin,
  Printer,
  ShieldCheck,
  Lock,
  EyeOff,
  Store,
} from "lucide-react";

export const metadata = {
  title: "How It Works - PrintSafe",
  description:
    "Learn how PrintSafe protects your sensitive documents with zero-trust envelope encryption, anonymous aliases, and locked watermarked viewers.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen text-[var(--text)] p-4 sm:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button3D variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
            </Button3D>
          </Link>
          <Link href="/privacy">
            <Button3D variant="outline" size="sm">
              Privacy Policy
            </Button3D>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Badge variant="info" size="md">
            Simple 3-Step Flow
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text)]">
            How PrintSafe protects your documents
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
            Print files at any neighborhood Xerox shop without leaving behind
            your personal contact details or digital file copies.
          </p>
        </div>

        {/* 3 Step Flow Vertical Stack */}
        <div className="flex flex-col gap-6 w-full">
          {/* Step 1 */}
          <Card3D className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left p-6 sm:p-8 gap-6 bg-[var(--surface)] border border-[var(--border)] extrude-md">
            <div className="w-16 h-16 shrink-0 rounded-md bg-[var(--accent-fill)] border border-[var(--accent-fill-darker)] flex items-center justify-center font-black text-2xl text-zinc-950 extrude-sm">
              1
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Upload className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-2xl font-bold text-[var(--text)]">
                  Upload to Vault
                </h2>
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Drop your PDF or image into your private vault. Files are
                encrypted with per-document AES-256 keys in the browser before
                they ever touch cloud storage.
              </p>
              <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] flex flex-col gap-1">
                <span className="font-bold text-[var(--text)] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Client-side envelope encryption:
                </span>
                <span>
                  No unencrypted files exist on disk. Unique DEKs (Data
                  Encryption Keys) protect each document individually.
                </span>
              </div>
            </div>
          </Card3D>

          {/* Step 2 */}
          <Card3D className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left p-6 sm:p-8 gap-6 bg-[var(--surface)] border border-[var(--border)] extrude-md">
            <div className="w-16 h-16 shrink-0 rounded-md bg-[var(--accent-fill)] border border-[var(--accent-fill-darker)] flex items-center justify-center font-black text-2xl text-zinc-950 extrude-sm">
              2
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <MapPin className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-2xl font-bold text-[var(--text)]">
                  Pick a Live Shop
                </h2>
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Find verified shops currently online near you on our real-time
                map. Confirm your settings (pages, color, duplex) and see the
                exact price upfront.
              </p>
              <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] flex flex-col gap-1">
                <span className="font-bold text-[var(--text)] flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Total identity masking:
                </span>
                <span>
                  The shop only sees &quot;Customer A7F2&quot;. Your phone
                  number, email address, and personal profile are never exposed.
                </span>
              </div>
            </div>
          </Card3D>

          {/* Step 3 */}
          <Card3D className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left p-6 sm:p-8 gap-6 bg-[var(--surface)] border border-[var(--border)] extrude-md">
            <div className="w-16 h-16 shrink-0 rounded-md bg-[var(--accent-fill)] border border-[var(--accent-fill-darker)] flex items-center justify-center font-black text-2xl text-zinc-950 extrude-sm">
              3
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Printer className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-2xl font-bold text-[var(--text)]">
                  Show Code &amp; Print
                </h2>
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Show your 4-digit handover code at the counter. The merchant
                unlocks a secure, watermarked viewer for printing. As soon as it
                prints, access vanishes.
              </p>
              <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] flex flex-col gap-1">
                <span className="font-bold text-[var(--text)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Forensic watermarking &amp; self-destruction:
                </span>
                <span>
                  Pages render with operator-traceable watermarks. Zero file
                  download endpoints exist, and access tokens expire immediately
                  after job completion.
                </span>
              </div>
            </div>
          </Card3D>
        </div>

        {/* Actions & Next Steps */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] extrude-md p-8 text-center flex flex-col items-center gap-4">
          <h3 className="text-xl font-extrabold text-[var(--text)]">
            Ready to try zero-trust printing?
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md">
            Get started for free in under two minutes with no app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/signup">
              <Button3D variant="primary" size="md">
                Start Printing Now <ArrowRight className="w-4 h-4 ml-1" />
              </Button3D>
            </Link>
            <Link href="/merchant/signup">
              <Button3D variant="secondary" size="md">
                <Store className="w-4 h-4 mr-1" /> Register Print Shop
              </Button3D>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-[var(--text-muted)] pt-4">
          <p>
            PrintSafe &bull; Print anywhere. Share nothing. &bull; Made by Alvin
          </p>
        </div>
      </div>
    </div>
  );
}
