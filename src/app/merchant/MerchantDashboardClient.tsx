"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Printer,
  Clock,
  Users,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Calendar,
  Loader2,
} from "lucide-react";
import { MerchantShell } from "@/components/layout/MerchantShell";
import { Card3D, Button3D, Badge, Switch3D } from "@/components/ui";

interface DashboardData {
  shop: {
    id: string;
    name: string;
    addressLine: string;
    city: string;
    status: string;
    manualLive: boolean;
    scheduleEnabled: boolean;
    priceBwPaise: number;
    priceColorPaise: number;
  };
  isLive: boolean;
  subscription: {
    id: string;
    status: string;
    periodEnd: string;
  } | null;
  plan: {
    id: string;
    name: string;
    limits: {
      jobs_per_month?: number;
      customers_per_month?: number | null;
    };
  } | null;
  usage: {
    todayJobs: number;
    pendingJobs: number;
    activeJobs: number;
    monthJobs: number;
    monthUniqueCustomers: number;
    jobsLimit: number;
    customersLimit: number;
    isCapReached: boolean;
    periodEnd: string | null;
  };
  recentJobs: Array<{
    id: string;
    mode: "near" | "far";
    status: string;
    sheets: number;
    quotePaise: number;
    requestedAt: string;
    acceptedAt: string | null;
    customerAlias: string;
  }>;
}

export function MerchantDashboardClient({
  initialData,
}: {
  initialData?: DashboardData;
}) {
  const [data, setData] = useState<DashboardData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isTogglingLive, setIsTogglingLive] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/merchant/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.warn("Failed to refresh dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 15-second polling while tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchDashboard();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  async function handleToggleLive(nextState: boolean) {
    if (!data || isTogglingLive) return;
    setIsTogglingLive(true);

    // Optimistic
    setData({
      ...data,
      isLive: nextState,
      shop: { ...data.shop, manualLive: nextState },
    });

    try {
      const res = await fetch("/api/merchant/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualLive: nextState }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        // Revert
        setData({
          ...data,
          isLive: !nextState,
          shop: { ...data.shop, manualLive: !nextState },
        });
        alert(resJson.error || "Failed to toggle live state.");
      } else {
        void fetchDashboard();
      }
    } catch {
      // Revert
      setData({
        ...data,
        isLive: !nextState,
        shop: { ...data.shop, manualLive: !nextState },
      });
      alert("Network error updating live state.");
    } finally {
      setIsTogglingLive(false);
    }
  }

  if (isLoading || !data) {
    return (
      <MerchantShell shopName="Print Shop" isLiveInitial={false}>
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-xs text-[var(--text-muted)] font-semibold">
            Loading merchant workspace...
          </p>
        </div>
      </MerchantShell>
    );
  }

  const { shop, isLive, subscription, plan, usage, recentJobs } = data;

  // Percentage calculations
  const jobsPercent = Math.min(
    100,
    Math.round((usage.monthJobs / (usage.jobsLimit || 1)) * 100)
  );
  const customersPercent = Math.min(
    100,
    Math.round((usage.monthUniqueCustomers / (usage.customersLimit || 1)) * 100)
  );

  return (
    <MerchantShell
      shopName={shop.name}
      isLiveInitial={shop.manualLive}
      onLiveChange={(live) => setData({ ...data, isLive: live })}
    >
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                {shop.name}
              </h1>
              {isLive ? (
                <Badge variant="live">LIVE ON MAP</Badge>
              ) : (
                <Badge variant="neutral">OFFLINE</Badge>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {shop.addressLine}, {shop.city}
            </p>
          </div>
        </div>

        {/* Plan Limit Warning Banner */}
        {usage.isCapReached && (
          <div className="p-4 rounded-2xl bg-[var(--danger-fill)]/15 border-2 border-[var(--danger)] text-xs text-[var(--danger)] font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-extrabold">Plan Volume Cap Reached!</p>
                <p className="text-[11px] font-normal opacity-90">
                  You have reached the monthly print volume limit for your plan.
                  New customer print requests are paused until upgraded.
                </p>
              </div>
            </div>
            <Link href="/merchant/billing" className="shrink-0">
              <Button3D variant="danger" size="sm">
                Upgrade Plan
              </Button3D>
            </Link>
          </div>
        )}

        {/* Big Live Switch Hero Card */}
        <Card3D className="p-6 bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] border-2 border-[var(--border)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                  Instant Storefront Controller
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight">
                {isLive
                  ? "Your Print Shop is Live & Taking Orders"
                  : "Your Print Shop is Currently Offline"}
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {isLive
                  ? "Nearby customers see your shop on the live map and can submit print jobs instantly. Handover passcodes protect your viewer."
                  : "Customers cannot see your shop on the live map. Switch on when you are open and ready at your counter."}
              </p>

              {shop.scheduleEnabled && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] text-[11px] font-semibold text-[var(--text-muted)] mt-2">
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Automatic Schedule Active</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center sm:items-end gap-2">
              <Switch3D
                checked={isLive}
                onCheckedChange={handleToggleLive}
                labelOn="LIVE"
                labelOff="OFFLINE"
                className="w-40 h-14 text-sm"
              />
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                Updates customer map in &lt;15s
              </span>
            </div>
          </div>
        </Card3D>

        {/* 4 Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card3D className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                Today&apos;s Jobs
              </span>
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <Printer className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black font-mono tracking-tight">
                {usage.todayJobs}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Processed since midnight
              </p>
            </div>
          </Card3D>

          <Card3D className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                Pending Queue
              </span>
              <div className="w-8 h-8 rounded-xl bg-[var(--info-fill)]/20 border border-[var(--info)] flex items-center justify-center text-[var(--info)]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black font-mono tracking-tight text-[var(--info)]">
                {usage.pendingJobs}
              </div>
              <Link
                href="/merchant/queue"
                className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 mt-0.5"
              >
                Open incoming queue &rarr;
              </Link>
            </div>
          </Card3D>

          {/* Monthly Jobs Meter */}
          <Card3D className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                Monthly Jobs
              </span>
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono tracking-tight">
                  {usage.monthJobs}
                </span>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  / {usage.jobsLimit} limit
                </span>
              </div>
              {/* 3D Progress Bar */}
              <div className="w-full h-2 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    jobsPercent >= 90
                      ? "bg-[var(--danger)]"
                      : jobsPercent >= 75
                        ? "bg-[var(--warning)]"
                        : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${jobsPercent}%` }}
                />
              </div>
            </div>
          </Card3D>

          {/* Monthly Customers Meter */}
          <Card3D className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                Unique Customers
              </span>
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono tracking-tight">
                  {usage.monthUniqueCustomers}
                </span>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  / {usage.customersLimit} limit
                </span>
              </div>
              {/* 3D Progress Bar */}
              <div className="w-full h-2 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    customersPercent >= 90
                      ? "bg-[var(--danger)]"
                      : customersPercent >= 75
                        ? "bg-[var(--warning)]"
                        : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${customersPercent}%` }}
                />
              </div>
            </div>
          </Card3D>
        </div>

        {/* Plan & Subscription Card */}
        <Card3D className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-fill)]/20 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[var(--text)]">
                  {plan?.name || "Growth"} Tier
                </span>
                <Badge
                  variant={
                    subscription?.status === "active" ? "approved" : "live"
                  }
                  size="sm"
                >
                  {subscription?.status?.toUpperCase() || "TRIAL"}
                </Badge>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Current period valid until{" "}
                {subscription?.periodEnd
                  ? new Date(subscription.periodEnd).toLocaleDateString()
                  : "30 days from signup"}
              </p>
            </div>
          </div>

          <Link href="/merchant/billing">
            <Button3D variant="secondary" size="sm">
              Manage Subscription &amp; Plans
            </Button3D>
          </Link>
        </Card3D>

        {/* Recent Jobs Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text)]">
              Recent Orders
            </h3>
            <Link
              href="/merchant/queue"
              className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              View Full Queue &rarr;
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <Card3D className="p-8 text-center space-y-2">
              <p className="text-xs text-[var(--text-muted)] font-semibold">
                No orders received yet today.
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Ensure your shop is toggled <strong>LIVE</strong> so customers
                near your locality can discover your store.
              </p>
            </Card3D>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((j) => (
                <Card3D
                  key={j.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--accent)]/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[var(--text)]">
                          {j.customerAlias}
                        </span>
                        <Badge
                          variant={j.mode === "near" ? "neutral" : "info"}
                          size="sm"
                        >
                          {j.mode === "near" ? "Walk-In" : "Pay & Collect"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                        {j.sheets} sheets &bull; ₹
                        {(j.quotePaise / 100).toFixed(2)} &bull;{" "}
                        {new Date(j.requestedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <Badge
                      variant={
                        j.status === "requested"
                          ? "live"
                          : j.status === "completed"
                            ? "approved"
                            : j.status === "rejected" ||
                                j.status === "cancelled"
                              ? "rejected"
                              : "info"
                      }
                      size="sm"
                    >
                      {j.status.toUpperCase()}
                    </Badge>

                    <Link href={`/merchant/jobs/${j.id}`}>
                      <Button3D
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1 text-xs"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button3D>
                    </Link>
                  </div>
                </Card3D>
              ))}
            </div>
          )}
        </div>
      </div>
    </MerchantShell>
  );
}
