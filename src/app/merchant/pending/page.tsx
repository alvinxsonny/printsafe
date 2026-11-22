"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Store,
  MapPin,
  FileText,
  RotateCcw,
  ArrowRight,
  LogOut,
  Loader2,
} from "lucide-react";
import { Card3D, Button3D, Badge, Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { authClient } from "@/lib/auth/client";
import type { Shop } from "@/lib/db/queries";

export default function MerchantPendingPage() {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [lastReview, setLastReview] = useState<{
    decision: string;
    notes?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/merchant/shop")
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/merchant/login");
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted || !data) return;
        if (!data.shop) {
          router.push("/merchant/onboarding");
          return;
        }
        setShop(data.shop);
        setLastReview(data.lastReview || null);
        if (data.shop.status === "approved") {
          router.push("/merchant");
          return;
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Could not fetch status:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleManualRefresh() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/merchant/shop");
      if (res.ok) {
        const data = await res.json();
        if (data.shop) {
          setShop(data.shop);
          setLastReview(data.lastReview || null);
          if (data.shop.status === "approved") {
            router.push("/merchant");
          }
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/merchant/login");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            Checking verification status...
          </p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return null;
  }

  const isChangesRequested = shop.status === "changes_requested";
  const isRejected = shop.status === "rejected";

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={38} showText={false} />
            <div>
              <h1 className="text-base font-extrabold tracking-tight">
                PrintSafe Merchant
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Application Status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button3D
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button3D>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Status Card */}
        <Card3D className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isChangesRequested ? (
                  <Badge variant="pending" size="md">
                    Changes Requested
                  </Badge>
                ) : isRejected ? (
                  <Badge variant="rejected" size="md">
                    Application Rejected
                  </Badge>
                ) : (
                  <Badge variant="pending" size="md">
                    Under Review
                  </Badge>
                )}
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  ID: {shop.id.slice(0, 8)}...
                </span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                {isChangesRequested
                  ? "Action Required on Your Application"
                  : isRejected
                    ? "Application Not Approved"
                    : "Application Under Review"}
              </h2>
            </div>

            <Button3D
              variant="secondary"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="shrink-0 flex items-center gap-1.5"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button3D>
          </div>

          {/* Banner message */}
          {isChangesRequested ? (
            <div className="p-5 rounded-2xl bg-[var(--warm-fill)]/15 border border-[var(--warm)] space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--warm)] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-[var(--text)]">
                    Admin Feedback
                  </h4>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    {lastReview?.notes ||
                      "The verification team requested modifications to your submitted shop details."}
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Button3D
                  variant="primary"
                  size="sm"
                  onClick={() => router.push("/merchant/onboarding")}
                  className="flex items-center gap-1.5"
                >
                  Edit Application
                  <ArrowRight className="w-4 h-4" />
                </Button3D>
              </div>
            </div>
          ) : isRejected ? (
            <div className="p-5 rounded-2xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] space-y-2 text-xs">
              <h4 className="font-bold text-[var(--danger)]">
                Verification Unsuccessful
              </h4>
              <p className="text-[var(--text-muted)] leading-relaxed">
                {lastReview?.notes ||
                  "Unfortunately, this application does not meet our storefront verification criteria. If you believe this is a mistake, please reach out to admin support."}
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[var(--warm)] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-[var(--text)]">
                    Admin Verification in Progress
                  </h4>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    Our admin team is verifying your storefront details and
                    matching the location pin. Verification is typically
                    completed within 24 hours.
                  </p>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    You will receive an email notification as soon as your
                    account is approved. Once approved, your 30-day Growth trial
                    will start and you will be able to turn your shop{" "}
                    <strong>LIVE</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary of submitted details */}
          <div className="space-y-4 pt-2 border-t border-[var(--border)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Submitted Shop Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-semibold">
                  <Store className="w-3.5 h-3.5" />
                  Shop Name
                </div>
                <div className="font-bold text-[var(--text)]">{shop.name}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-semibold">
                  <MapPin className="w-3.5 h-3.5" />
                  Address
                </div>
                <div className="font-medium text-[var(--text)] truncate">
                  {shop.addressLine}, {shop.city}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-semibold">
                  <FileText className="w-3.5 h-3.5" />
                  Per-Page Rates
                </div>
                <div className="font-bold text-[var(--text)]">
                  B&W: ₹{(shop.priceBwPaise / 100).toFixed(2)} &bull; Colour: ₹
                  {(shop.priceColorPaise / 100).toFixed(2)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Storefront Photo
                </div>
                <div className="font-bold text-[var(--text)]">
                  {shop.storefrontPhotoKey
                    ? "Uploaded & Encrypted"
                    : "No photo provided"}
                </div>
              </div>
            </div>
          </div>
        </Card3D>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-4 text-center text-xs text-[var(--text-muted)]">
        PrintSafe Zero-Trust Print Network &bull;{" "}
        <Link href="/privacy" className="underline hover:text-[var(--text)]">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
