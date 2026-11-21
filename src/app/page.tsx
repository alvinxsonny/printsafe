"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  EyeOff,
  Clock,
  Trash2,
  Lock,
  ArrowRight,
  FileText,
  CheckCircle,
  AlertTriangle,
  Store,
} from "lucide-react";
import {
  Button3D,
  Card3D,
  Badge,
  ThemeToggle,
  PaperStackIllustration,
} from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col selection:bg-[var(--accent-fill)] selection:text-[#14213D]">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-[var(--accent-fill)] border border-[#2EB673] flex items-center justify-center font-bold text-[#14213D] extrude-sm text-sm">
              PS
            </span>
            <span className="text-xl font-bold tracking-tight">
              Print
              <span className="text-[#12724A] dark:text-[var(--accent)]">
                Safe
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--text-muted)]">
            <a
              href="#problem"
              className="hover:text-[var(--text)] transition-colors"
            >
              The Problem
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[var(--text)] transition-colors"
            >
              How It Works
            </a>
            <a
              href="#privacy"
              className="hover:text-[var(--text)] transition-colors"
            >
              Privacy Guarantees
            </a>
            <a
              href="#limits"
              className="hover:text-[var(--text)] transition-colors"
            >
              Honest Limits
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button3D variant="outline" size="sm">
                Log In
              </Button3D>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start">
              <Badge variant="live" size="md">
                Zero-Trust Document Printing
              </Badge>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[var(--text)] leading-[1.1]">
              Print anywhere. <br />
              <span className="text-[#12724A] dark:text-[var(--accent)] underline decoration-wavy decoration-[#3DD68C]/50">
                Share nothing.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-[var(--text-muted)] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Stop emailing Aadhaar, marksheets, and bank forms to neighborhood
              print shops. PrintSafe lets print shops view and print your files
              inside a locked, watermarked viewer without ever downloading a
              copy or seeing your personal phone number.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button3D
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto text-base"
                >
                  I want to print <ArrowRight className="w-5 h-5 ml-1" />
                </Button3D>
              </Link>
              <Link href="/merchant/signup" className="w-full sm:w-auto">
                <Button3D
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto text-base"
                >
                  <Store className="w-5 h-5 mr-1" /> I own a print shop
                </Button3D>
              </Link>
            </div>

            {/* Trust highlights */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-semibold text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#12724A] dark:text-[var(--accent)]" />{" "}
                No file downloads
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#12724A] dark:text-[var(--accent)]" />{" "}
                Anonymous aliases
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#12724A] dark:text-[var(--accent)]" />{" "}
                Auto-expiring access
              </span>
            </div>
          </div>

          {/* Right 3D Visual Column */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
              {/* Background Ambient Glow */}
              <div className="absolute inset-0 bg-[#3DD68C]/15 rounded-full blur-3xl" />

              {/* 3D Tilted Card Preview */}
              <Card3D className="w-full max-w-sm flex flex-col items-center p-8 bg-[var(--surface)] relative z-10">
                <PaperStackIllustration className="w-44 h-44 mb-4 drop-shadow-lg" />
                <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] mb-3">
                  <span className="text-xs font-bold text-[var(--text)]">
                    Document #PS-8821
                  </span>
                  <Badge variant="live" size="sm">
                    Watermarked
                  </Badge>
                </div>
                <div className="w-full flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                  <span>Alias: Customer A7F2</span>
                  <span className="tabular-nums">Code: • • • •</span>
                </div>
              </Card3D>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section
        id="problem"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--surface)] border-y border-[var(--border)]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="rejected" size="md">
              The Risk You Take Today
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 text-[var(--text)]">
              Neighborhood Xerox shops are accidental document leak hubs
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-muted)] mt-3">
              Every day, millions send unencrypted sensitive documents via
              WhatsApp or email. Here is what happens next:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card3D className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--danger-fill)]/15 border border-[var(--danger-fill)]/30 flex items-center justify-center text-[var(--danger)] extrude-sm">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text)]">
                Files Stored Forever
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Shops download your Aadhaar cards, tax slips, and medical
                records directly to shared desktop folders. They are rarely if
                ever deleted.
              </p>
            </Card3D>

            <Card3D className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--warm-fill)]/15 border border-[var(--warm-fill)]/30 flex items-center justify-center text-[var(--warm)] extrude-sm">
                <EyeOff className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text)]">
                Contact & Phone Leaks
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Your personal WhatsApp chat and phone number remain on open
                counter screens visible to staff, visitors, and other waiting
                customers.
              </p>
            </Card3D>

            <Card3D className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--danger-fill)]/15 border border-[var(--danger-fill)]/30 flex items-center justify-center text-[var(--danger)] extrude-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text)]">
                Identity Theft & Spam
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Once files leak or the computer is sold, private financial and
                identity records fuel targeted phishing, loan scams, and endless
                spam.
              </p>
            </Card3D>
          </div>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section
        id="how-it-works"
        className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="info" size="md">
            Simple 3-Step Flow
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 text-[var(--text)]">
            How PrintSafe protects your documents
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-muted)] mt-3">
            Simple for customers, zero friction for Xerox shop owners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center p-6 rounded-[28px] bg-[var(--surface)] border border-[var(--border)] extrude-md">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-fill)] border border-[#2EB673] flex items-center justify-center font-bold text-xl text-[#14213D] extrude-sm mb-6">
              1
            </div>
            <h3 className="text-xl font-bold text-[var(--text)]">
              Upload to Vault
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              Drop your PDF or image into your private vault. Files are
              encrypted with per-document AES-256 keys before they ever touch
              cloud storage.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-[28px] bg-[var(--surface)] border border-[var(--border)] extrude-md">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-fill)] border border-[#2EB673] flex items-center justify-center font-bold text-xl text-[#14213D] extrude-sm mb-6">
              2
            </div>
            <h3 className="text-xl font-bold text-[var(--text)]">
              Pick a Live Shop
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              Find verified shops currently online near you on our real-time
              map. Confirm your settings (pages, color, duplex) and see the
              exact price upfront.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-[28px] bg-[var(--surface)] border border-[var(--border)] extrude-md">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-fill)] border border-[#2EB673] flex items-center justify-center font-bold text-xl text-[#14213D] extrude-sm mb-6">
              3
            </div>
            <h3 className="text-xl font-bold text-[var(--text)]">
              Show Code & Print
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              Show your 4-digit handover code at the counter. The merchant
              unlocks a secure, watermarked viewer for printing. As soon as it
              prints, access vanishes.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Guarantees */}
      <section
        id="privacy"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--surface)] border-y border-[var(--border)]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="live" size="md">
              Core Guarantees
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 text-[var(--text)]">
              Our 4 Zero-Trust Privacy Promises
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-muted)] mt-3">
              We engineered the entire system around the principle that the shop
              should never own your data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card3D className="flex flex-col gap-2">
              <ShieldCheck className="w-8 h-8 text-[#12724A] dark:text-[var(--accent)] mb-2" />
              <h4 className="text-base font-bold text-[var(--text)]">
                No Downloads
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                There is literally no download button and no file endpoint. The
                shop only receives watermarked page images.
              </p>
            </Card3D>

            <Card3D className="flex flex-col gap-2">
              <EyeOff className="w-8 h-8 text-[#12724A] dark:text-[var(--accent)] mb-2" />
              <h4 className="text-base font-bold text-[var(--text)]">
                Anonymous Aliases
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                The shop only sees &quot;Customer A7F2&quot;. Your phone number,
                email address, and real name are never exposed.
              </p>
            </Card3D>

            <Card3D className="flex flex-col gap-2">
              <Clock className="w-8 h-8 text-[#12724A] dark:text-[var(--accent)] mb-2" />
              <h4 className="text-base font-bold text-[var(--text)]">
                Time-Bounded Access
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Viewing is restricted to a 30-minute window. Once the job is
                marked printed, all viewing tokens are immediately revoked.
              </p>
            </Card3D>

            <Card3D className="flex flex-col gap-2">
              <Trash2 className="w-8 h-8 text-[#12724A] dark:text-[var(--accent)] mb-2" />
              <h4 className="text-base font-bold text-[var(--text)]">
                User-Controlled Retention
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Choose &quot;Delete immediately after printing&quot; or keep in
                vault for N days. Hard delete permanently destroys keys and
                blobs.
              </p>
            </Card3D>
          </div>
        </div>
      </section>

      {/* Honest Limits Note */}
      <section
        id="limits"
        className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full"
      >
        <div className="p-8 rounded-[28px] bg-[var(--surface-2)] border-2 border-[var(--border)] extrude-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--warm)] extrude-sm shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold text-[var(--text)]">
                Our Honest Limits
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                A web application cannot physically prevent someone from taking
                a phone photo of a monitor, taking a desktop screenshot, or
                choosing &quot;Save as PDF&quot; inside the browser&apos;s
                system print dialog.
              </p>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                PrintSafe makes leaks difficult, strictly traceable, and
                short-lived through forensic watermarks, encrypted streams,
                right-click deterrence, and automatic expiration. A dedicated
                desktop Print Agent is planned for future versions to close the
                Save-as-PDF gap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-[32px] bg-[var(--surface)] border border-[var(--border)] extrude-lg p-8 sm:p-14 text-center flex flex-col items-center gap-6">
          <Badge variant="live" size="md">
            Ready to print safely?
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text)] max-w-2xl">
            Protect your documents on your very next print.
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-xl">
            No app store download required. Works right inside your mobile
            browser in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2 w-full sm:w-auto">
            <Link href="/signup">
              <Button3D
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Start Printing Now
              </Button3D>
            </Link>
            <Link href="/merchant/signup">
              <Button3D
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Register Your Shop
              </Button3D>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[var(--accent-fill)] border border-[#2EB673] flex items-center justify-center font-bold text-[#14213D] text-xs">
              PS
            </span>
            <span className="font-bold text-[var(--text)]">PrintSafe</span>
            <span>— Print anywhere. Share nothing.</span>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <Link
              href="/privacy"
              className="hover:text-[var(--text)] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-[var(--text)] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/how-it-works"
              className="hover:text-[var(--text)] transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/dev/ui"
              className="text-[var(--accent)] hover:underline"
            >
              Component Kit (Dev)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
