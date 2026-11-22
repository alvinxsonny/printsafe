"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  EyeOff,
  Clock,
  Trash2,
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
  Logo,
} from "@/components/ui";
import { FootprintTree } from "@/components/tree";

export default function LandingPage() {
  const [pricingTab, setPricingTab] = useState<"customer" | "merchant">(
    "customer"
  );
  return (
    <div className="min-h-screen text-[var(--text)] flex flex-col selection:bg-[var(--accent-fill)] selection:text-zinc-950">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={36} />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--text-muted)]">
            <a
              href="#problem"
              className="hover:text-[var(--text)] transition-colors"
            >
              The Problem
            </a>
            <Link
              href="/how-it-works"
              className="hover:text-[var(--text)] transition-colors"
            >
              How It Works
            </Link>
            <a
              href="#privacy"
              className="hover:text-[var(--text)] transition-colors"
            >
              Privacy Guarantees
            </a>
            <a
              href="#plans"
              className="hover:text-[var(--text)] transition-colors"
            >
              Plans &amp; Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button3D
                variant="outline"
                size="sm"
                className="h-9 px-3.5 font-bold"
              >
                Log In
              </Button3D>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Fills viewport height before scrolling */}
      <section className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
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
              <span className="text-[var(--accent)] underline decoration-wavy decoration-[var(--accent)]/50">
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
                <CheckCircle className="w-4 h-4 text-[var(--accent)]" /> No file
                downloads
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[var(--accent)]" />{" "}
                Anonymous aliases
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[var(--accent)]" />{" "}
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
        className="scroll-mt-28 py-24 px-4 sm:px-6 lg:px-8 bg-[var(--surface)]/60 backdrop-blur-xs border-y border-[var(--border)]"
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
        className="scroll-mt-28 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
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

        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
          <Card3D className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left p-6 sm:p-8 gap-6 bg-[var(--surface)] border border-[var(--border)] extrude-md">
            <div className="w-14 h-14 shrink-0 rounded-md bg-[var(--accent-fill)] border border-[var(--accent-fill-darker)] flex items-center justify-center font-black text-xl text-zinc-950 extrude-sm">
              1
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--text)]">
                Upload to Vault
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Drop your PDF or image into your private vault. Files are
                encrypted with per-document AES-256 keys before they ever touch
                cloud storage.
              </p>
            </div>
          </Card3D>

          <Card3D className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left p-6 sm:p-8 gap-6 bg-[var(--surface)] border border-[var(--border)] extrude-md">
            <div className="w-14 h-14 shrink-0 rounded-md bg-[var(--accent-fill)] border border-[var(--accent-fill-darker)] flex items-center justify-center font-black text-xl text-zinc-950 extrude-sm">
              2
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--text)]">
                Pick a Live Shop
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Find verified shops currently online near you on our real-time
                map. Confirm your settings (pages, color, duplex) and see the
                exact price upfront.
              </p>
            </div>
          </Card3D>

          <Card3D className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left p-6 sm:p-8 gap-6 bg-[var(--surface)] border border-[var(--border)] extrude-md">
            <div className="w-14 h-14 shrink-0 rounded-md bg-[var(--accent-fill)] border border-[var(--accent-fill-darker)] flex items-center justify-center font-black text-xl text-zinc-950 extrude-sm">
              3
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--text)]">
                Show Code &amp; Print
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Show your 4-digit handover code at the counter. The merchant
                unlocks a secure, watermarked viewer for printing. As soon as it
                prints, access vanishes.
              </p>
            </div>
          </Card3D>
        </div>
      </section>

      {/* Privacy Guarantees */}
      <section
        id="privacy"
        className="scroll-mt-28 py-24 px-4 sm:px-6 lg:px-8 bg-[var(--surface)]/60 backdrop-blur-xs border-y border-[var(--border)]"
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
              <ShieldCheck className="w-8 h-8 text-[var(--accent)] mb-2" />
              <h4 className="text-base font-bold text-[var(--text)]">
                No Downloads
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                There is literally no download button and no file endpoint. The
                shop only receives watermarked page images.
              </p>
            </Card3D>

            <Card3D className="flex flex-col gap-2">
              <EyeOff className="w-8 h-8 text-[var(--accent)] mb-2" />
              <h4 className="text-base font-bold text-[var(--text)]">
                Anonymous Aliases
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                The shop only sees &quot;Customer A7F2&quot;. Your phone number,
                email address, and real name are never exposed.
              </p>
            </Card3D>

            <Card3D className="flex flex-col gap-2">
              <Clock className="w-8 h-8 text-[var(--accent)] mb-2" />
              <h4 className="text-base font-bold text-[var(--text)]">
                Time-Bounded Access
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Viewing is restricted to a 30-minute window. Once the job is
                marked printed, all viewing tokens are immediately revoked.
              </p>
            </Card3D>

            <Card3D className="flex flex-col gap-2">
              <Trash2 className="w-8 h-8 text-[var(--accent)] mb-2" />
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

      {/* Creative Feature: Paper Footprint Tree (Phase 14) */}
      <section
        id="footprint"
        className="scroll-mt-28 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
            <Badge variant="live" size="md">
              Creative Feature &bull; Eco Impact
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text)]">
              The Paper Footprint Tree
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
              Every printed sheet has an ecological footprint. PrintSafe
              includes a playful, isometric 3D tree that visualizes your paper
              usage scale: each 10 sheets printed removes one canopy tier. If
              you harvest 5 tiers, the tree becomes a stump with logs while a
              new sapling sprouts beside it.
            </p>
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] space-y-1">
              <p className="font-bold text-[var(--text)]">
                Transparent &amp; honest metrics:
              </p>
              <p>
                We calculate real forest impact using an approximate conversion
                of 8,333 sheets per tree, encouraging digital PDF sharing
                whenever possible.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <Card3D className="p-6 bg-[var(--surface)] max-w-sm w-full">
              <FootprintTree
                sheetsPrintedTotal={14}
                hasNoPrintsLast30Days={false}
              />
            </Card3D>
          </div>
        </div>
      </section>

      {/* MVP Plans & Pricing */}
      <section
        id="plans"
        className="scroll-mt-28 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
      >
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <Badge variant="live" size="md">
            Transparent Pricing &bull; No Hidden Fees
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text)]">
            Simple Plans for Customers &amp; Print Shops
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-muted)]">
            Pick the plan tailored to your printing needs. Upgrade or cancel
            anytime.
          </p>

          {/* Tab Selector */}
          <div className="inline-flex p-1 rounded-md bg-[var(--surface-2)] border border-[var(--border)] gap-1">
            <button
              onClick={() => setPricingTab("customer")}
              className={cn(
                "px-5 py-2 text-xs font-bold rounded-md transition-all cursor-pointer",
                pricingTab === "customer"
                  ? "bg-[var(--surface)] text-[var(--text)] extrude-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              For Customers
            </button>
            <button
              onClick={() => setPricingTab("merchant")}
              className={cn(
                "px-5 py-2 text-xs font-bold rounded-md transition-all cursor-pointer",
                pricingTab === "merchant"
                  ? "bg-[var(--surface)] text-[var(--text)] extrude-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              For Print Shops
            </button>
          </div>
        </div>

        {pricingTab === "customer" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Customer Free */}
            <Card3D className="flex flex-col justify-between p-8 bg-[var(--surface)] border border-[var(--border)] extrude-md">
              <div className="space-y-6">
                <div>
                  <Badge variant="approved" size="sm">
                    Free Forever
                  </Badge>
                  <h3 className="text-2xl font-extrabold text-[var(--text)] mt-2">
                    Free
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Zero-trust security for occasional personal printing.
                  </p>
                </div>
                <div className="text-3xl font-extrabold text-[var(--text)]">
                  ₹0{" "}
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    / month
                  </span>
                </div>
                <ul className="space-y-3 text-xs text-[var(--text)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>10 uploads</strong> per month
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>100 MB</strong> encrypted vault storage
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      Anonymous aliases (e.g. &quot;Customer A7F2&quot;)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>Dynamic forensic watermarking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>Auto-expiring 4-digit handover codes</span>
                  </li>
                </ul>
              </div>
              <Link href="/signup" className="pt-8">
                <Button3D variant="outline" size="md" className="w-full">
                  Start Free
                </Button3D>
              </Link>
            </Card3D>

            {/* Customer Plus */}
            <Card3D className="flex flex-col justify-between p-8 bg-[var(--surface)] border-2 border-[var(--accent)] extrude-lg relative">
              <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-[var(--accent-fill)] text-zinc-950 text-[10px] font-black uppercase tracking-wider extrude-accent-sm">
                Recommended
              </div>
              <div className="space-y-6">
                <div>
                  <Badge variant="live" size="sm">
                    Plus Tier
                  </Badge>
                  <h3 className="text-2xl font-extrabold text-[var(--text)] mt-2">
                    Plus
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    For frequent print requests, students &amp; professionals.
                  </p>
                </div>
                <div className="text-3xl font-extrabold text-[var(--text)]">
                  ₹49{" "}
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    / month
                  </span>
                </div>
                <ul className="space-y-3 text-xs text-[var(--text)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>100 uploads</strong> per month
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>2 GB (2048 MB)</strong> encrypted vault
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>Priority upload &amp; processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>Multi-device vault sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>Full anonymous privacy protection</span>
                  </li>
                </ul>
              </div>
              <Link href="/signup" className="pt-8">
                <Button3D variant="primary" size="md" className="w-full">
                  Get Plus
                </Button3D>
              </Link>
            </Card3D>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Merchant Starter */}
            <Card3D className="flex flex-col justify-between p-6 bg-[var(--surface)] border border-[var(--border)] extrude-md">
              <div className="space-y-5">
                <div>
                  <Badge variant="approved" size="sm">
                    Starter
                  </Badge>
                  <h3 className="text-xl font-extrabold text-[var(--text)] mt-2">
                    Starter
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    For neighborhood Xerox &amp; single-operator copy shops.
                  </p>
                </div>
                <div className="text-3xl font-extrabold text-[var(--text)]">
                  ₹299{" "}
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    / month
                  </span>
                </div>
                <ul className="space-y-2.5 text-xs text-[var(--text)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>100 print jobs</strong> / month
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>50 customers</strong> / month
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>1 device terminal &amp; 1 staff login</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>Locked secure print viewer</span>
                  </li>
                </ul>
              </div>
              <Link href="/merchant/signup" className="pt-6">
                <Button3D variant="outline" size="sm" className="w-full">
                  Register Shop
                </Button3D>
              </Link>
            </Card3D>

            {/* Merchant Growth */}
            <Card3D className="flex flex-col justify-between p-6 bg-[var(--surface)] border-2 border-[var(--accent)] extrude-lg relative">
              <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-[var(--accent-fill)] text-zinc-950 text-[10px] font-black uppercase tracking-wider extrude-accent-sm">
                Most Popular
              </div>
              <div className="space-y-5">
                <div>
                  <Badge variant="live" size="sm">
                    Growth
                  </Badge>
                  <h3 className="text-xl font-extrabold text-[var(--text)] mt-2">
                    Growth
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    For busy print centers near colleges and offices.
                  </p>
                </div>
                <div className="text-3xl font-extrabold text-[var(--text)]">
                  ₹599{" "}
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    / month
                  </span>
                </div>
                <ul className="space-y-2.5 text-xs text-[var(--text)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>500 print jobs</strong> / month
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>250 customers</strong> / month
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>2 terminals &amp; 2 staff logins</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>Priority listing</strong> on customer map
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>Real-time queue &amp; code verification</span>
                  </li>
                </ul>
              </div>
              <Link href="/merchant/signup" className="pt-6">
                <Button3D variant="primary" size="sm" className="w-full">
                  Start Growth
                </Button3D>
              </Link>
            </Card3D>

            {/* Merchant Pro */}
            <Card3D className="flex flex-col justify-between p-6 bg-[var(--surface)] border border-[var(--border)] extrude-md">
              <div className="space-y-5">
                <div>
                  <Badge variant="approved" size="sm">
                    Pro
                  </Badge>
                  <h3 className="text-xl font-extrabold text-[var(--text)] mt-2">
                    Pro
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    For high-volume commercial printing enterprises.
                  </p>
                </div>
                <div className="text-3xl font-extrabold text-[var(--text)]">
                  ₹999{" "}
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    / month
                  </span>
                </div>
                <ul className="space-y-2.5 text-xs text-[var(--text)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>1,500 print jobs</strong> / month
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      <strong>Unlimited customers</strong>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>5 terminals &amp; 5 staff logins</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>Analytics &amp; revenue insights</span>
                  </li>
                </ul>
              </div>
              <Link href="/merchant/signup" className="pt-6">
                <Button3D variant="outline" size="sm" className="w-full">
                  Get Pro
                </Button3D>
              </Link>
            </Card3D>
          </div>
        )}
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
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
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)] py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <Logo size={68} showText={false} />
            <div className="flex flex-col justify-between py-0.5">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text)] leading-tight">
                Print<span className="text-[var(--accent)]">Safe</span>
              </span>
              <span className="text-xs text-[var(--text-muted)] font-medium leading-normal">
                Print anywhere. Share nothing.
              </span>
              <span className="text-xs text-[var(--text-muted)] leading-normal">
                Made by{" "}
                <span className="font-bold text-[var(--text)]">Alvin</span>
              </span>
            </div>
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
          </div>
        </div>

        {/* Honest Limits Note inside footer as short small font note */}
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)] leading-relaxed">
          <p>
            <strong className="text-[var(--text)] font-semibold">
              Honest Limits Note:
            </strong>{" "}
            A web application cannot physically prevent someone from taking a
            phone photo of a screen, taking a desktop screenshot, or choosing
            &quot;Save as PDF&quot; in a browser&apos;s system print dialog.
            PrintSafe makes leaks difficult, strictly traceable, and short-lived
            via forensic watermarks, encrypted memory streams, right-click
            deterrence, and auto-expiring access tokens.
          </p>
        </div>
      </footer>
    </div>
  );
}
