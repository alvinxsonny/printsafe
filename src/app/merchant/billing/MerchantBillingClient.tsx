"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  TrendingUp,
  Users,
  Zap,
  Loader2,
} from "lucide-react";
import { MerchantShell } from "@/components/layout/MerchantShell";
import { Card3D, Button3D, Badge } from "@/components/ui";

interface BillingData {
  shop: {
    id: string;
    name: string;
    manualLive: boolean;
  };
  subscription: {
    id: string;
    status: string;
    periodStart: string;
    periodEnd: string;
  } | null;
  plan: {
    id: string;
    code: string;
    name: string;
    pricePaise: number;
    periodDays: number;
    limits: {
      jobs_per_month?: number;
      customers_per_month?: number | null;
      devices?: number;
    };
  } | null;
  usage: {
    monthJobs: number;
    monthUniqueCustomers: number;
    jobsLimit: number;
    customersLimit: number;
    isCapReached: boolean;
  };
}

const AVAILABLE_PLANS = [
  {
    code: "starter",
    name: "Starter",
    price: "₹299",
    period: "/month",
    description:
      "Ideal for small Xerox shops starting with zero-trust digital orders.",
    limits: {
      jobs: "100 jobs / month",
      customers: "50 unique customers",
      devices: "1 counter terminal",
    },
    features: [
      "Zero-trust watermarked reader",
      "Customer map listing",
      "Instant 4-digit handover codes",
      "Standard email notifications",
    ],
  },
  {
    code: "growth",
    name: "Growth",
    price: "₹599",
    period: "/month",
    description:
      "Best for busy neighbourhood photocopy shops near colleges & courts.",
    popular: true,
    limits: {
      jobs: "500 jobs / month",
      customers: "250 unique customers",
      devices: "2 counter terminals",
    },
    features: [
      "Everything in Starter",
      "Priority customer map listing",
      "Audible & visual live alerts",
      "Automated operating schedule",
      "Fast queue processing",
    ],
  },
  {
    code: "pro",
    name: "Pro Volume",
    price: "₹1,199",
    period: "/month",
    description:
      "For high-volume printing hubs, blueprint centers & multi-operator stores.",
    limits: {
      jobs: "2,000 jobs / month",
      customers: "1,000 unique customers",
      devices: "5 counter terminals",
    },
    features: [
      "Everything in Growth",
      "Multi-staff counter logins",
      "A3 & colour bulk queues",
      "Advanced monthly analytics",
      "Dedicated merchant support",
    ],
  },
];

export function MerchantBillingClient() {
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await fetch("/api/merchant/dashboard");
        if (res.ok && !ignore) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.warn("Failed to load billing:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    void loadData();
    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading || !data) {
    return (
      <MerchantShell shopName="Billing & Plans">
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-xs text-[var(--text-muted)] font-semibold">
            Loading billing and plan details...
          </p>
        </div>
      </MerchantShell>
    );
  }

  const { shop, subscription, plan, usage } = data;

  const jobsPercent = Math.min(
    100,
    Math.round((usage.monthJobs / (usage.jobsLimit || 1)) * 100)
  );
  const customersPercent = Math.min(
    100,
    Math.round((usage.monthUniqueCustomers / (usage.customersLimit || 1)) * 100)
  );

  return (
    <MerchantShell shopName={shop.name} isLiveInitial={shop.manualLive}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="pb-4 border-b border-[var(--border)]">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Billing &amp; Subscription Plans
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage your store volume limits, active subscription period, and
            billing tiers.
          </p>
        </div>

        {/* Current Active Plan Overview */}
        <Card3D className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-fill)]/20 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0 extrude-sm">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-[var(--text)]">
                    {plan?.name || "Growth"} Tier
                  </h2>
                  <Badge
                    variant={
                      subscription?.status === "active" ? "approved" : "live"
                    }
                  >
                    {subscription?.status?.toUpperCase() || "30-DAY TRIAL"}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Valid until:{" "}
                  {subscription?.periodEnd
                    ? new Date(subscription.periodEnd).toLocaleDateString([], {
                        dateStyle: "medium",
                      })
                    : "End of initial trial period"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="neutral">Auto-Renews</Badge>
            </div>
          </div>

          {/* Usage Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--text)] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                  Monthly Job Volume
                </span>
                <span className="font-mono font-bold text-[var(--text)]">
                  {usage.monthJobs} / {usage.jobsLimit}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
                <div
                  className={`h-full ${
                    jobsPercent >= 90
                      ? "bg-[var(--danger)]"
                      : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${jobsPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">
                {usage.jobsLimit - usage.monthJobs > 0
                  ? `${usage.jobsLimit - usage.monthJobs} jobs remaining in current billing cycle`
                  : "Volume limit reached for this period."}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--text)] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[var(--accent)]" />
                  Unique Customer Reach
                </span>
                <span className="font-mono font-bold text-[var(--text)]">
                  {usage.monthUniqueCustomers} / {usage.customersLimit}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
                <div
                  className={`h-full ${
                    customersPercent >= 90
                      ? "bg-[var(--danger)]"
                      : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${customersPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">
                {usage.customersLimit - usage.monthUniqueCustomers > 0
                  ? `${usage.customersLimit - usage.monthUniqueCustomers} new unique customers remaining`
                  : "Customer limit reached for this period."}
              </p>
            </div>
          </div>
        </Card3D>

        {/* Plan Cards Grid */}
        <div className="space-y-4 pt-4">
          <div>
            <h3 className="text-base font-extrabold tracking-tight">
              Upgrade or Change Tier
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Scale your print job volume as your customer base expands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AVAILABLE_PLANS.map((p) => {
              const isCurrent =
                (plan?.code || "growth").toLowerCase() === p.code.toLowerCase();

              return (
                <Card3D
                  key={p.code}
                  className={`p-6 flex flex-col justify-between space-y-6 ${
                    p.popular
                      ? "border-2 border-[var(--accent)] relative shadow-lg"
                      : "border border-[var(--border)]"
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--accent-fill)] text-[#14213D] text-[10px] font-black uppercase tracking-wider extrude-accent-sm">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-extrabold text-[var(--text)]">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-mono text-[var(--text)]">
                        {p.price}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-medium">
                        {p.period}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[var(--border)] text-xs font-mono font-bold text-[var(--text)]">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>{p.limits.jobs}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>{p.limits.customers}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                      {p.features.map((feat, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs text-[var(--text-muted)]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    {isCurrent ? (
                      <Button3D
                        variant="secondary"
                        size="md"
                        disabled
                        className="w-full text-xs font-bold"
                      >
                        Current Plan
                      </Button3D>
                    ) : (
                      <Button3D
                        variant={p.popular ? "primary" : "secondary"}
                        size="md"
                        onClick={() =>
                          alert(
                            "Razorpay automated billing integration is connected in Phase 12. Your trial remains fully active!"
                          )
                        }
                        className="w-full text-xs font-bold"
                      >
                        Select {p.name}
                      </Button3D>
                    )}
                  </div>
                </Card3D>
              );
            })}
          </div>
        </div>
      </div>
    </MerchantShell>
  );
}
