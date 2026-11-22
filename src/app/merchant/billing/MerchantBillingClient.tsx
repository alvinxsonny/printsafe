"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  CheckCircle2,
  TrendingUp,
  Users,
  Zap,
  Loader2,
  Receipt,
  Printer,
  FileCheck,
  AlertCircle,
  X,
} from "lucide-react";
import { MerchantShell } from "@/components/layout/MerchantShell";
import { Card3D, Button3D, Badge } from "@/components/ui";
import { openRazorpayCheckout } from "@/lib/payments/client";

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

interface PaymentHistoryItem {
  id: string;
  kind: string;
  refId: string;
  amountPaise: number;
  amountRupees: string;
  status: "created" | "paid" | "failed" | "refunded";
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  receiptNumber: string;
  createdAt: string;
}

const AVAILABLE_PLANS = [
  {
    code: "starter",
    planId: "merchant_starter",
    name: "Starter",
    price: "₹299",
    pricePaise: 29900,
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
    planId: "merchant_growth",
    name: "Growth",
    price: "₹599",
    pricePaise: 59900,
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
    planId: "merchant_pro",
    name: "Pro Volume",
    price: "₹999",
    pricePaise: 99900,
    period: "/month",
    description:
      "For high-volume printing hubs, blueprint centers & multi-operator stores.",
    limits: {
      jobs: "1,500 jobs / month",
      customers: "Unlimited customers",
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
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPlan, setIsProcessingPlan] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<PaymentHistoryItem | null>(
    null
  );

  const loadData = useCallback(async () => {
    try {
      const [resDashboard, resHistory] = await Promise.all([
        fetch("/api/merchant/dashboard"),
        fetch("/api/payments/history"),
      ]);

      if (resDashboard.ok) {
        const json = await resDashboard.json();
        setData(json);
      }
      if (resHistory.ok) {
        const jsonHistory = await resHistory.json();
        setHistory(jsonHistory.payments || []);
      }
    } catch (err) {
      console.warn("Failed to load billing:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchBilling() {
      try {
        const [resDashboard, resHistory] = await Promise.all([
          fetch("/api/merchant/dashboard"),
          fetch("/api/payments/history"),
        ]);
        if (!ignore) {
          if (resDashboard.ok) {
            const json = await resDashboard.json();
            setData(json);
          }
          if (resHistory.ok) {
            const jsonHistory = await resHistory.json();
            setHistory(jsonHistory.payments || []);
          }
        }
      } catch (err) {
        console.warn("Failed to load billing:", err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    void fetchBilling();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSelectPlan(planId: string, planName: string) {
    setIsProcessingPlan(planId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Create Order Server-Side
      const resOrder = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "merchant_plan",
          refId: planId,
        }),
      });

      const orderData = await resOrder.json();
      if (!resOrder.ok) {
        throw new Error(
          orderData.error || "Failed to initiate subscription order."
        );
      }

      // 2. Open Razorpay Checkout Modal
      await openRazorpayCheckout({
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || "INR",
        name: "PrintSafe Merchant",
        description: `${planName} Subscription (30 Days)`,
        order_id: orderData.orderId,
        handler: async (response) => {
          // 3. Verify Payment Server-Side
          try {
            const resVerify = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await resVerify.json();
            if (!resVerify.ok) {
              throw new Error(
                verifyData.error || "Payment verification failed."
              );
            }

            setSuccessMessage(
              `Successfully upgraded to ${planName}! Your subscription is active for 30 days.`
            );
            await loadData();
          } catch (err) {
            setErrorMessage(
              err instanceof Error
                ? err.message
                : "Payment verification failed."
            );
          } finally {
            setIsProcessingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPlan(null);
          },
        },
        theme: {
          color: "#E5A93C", // PrintSafe Accent
        },
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Subscription checkout error."
      );
      setIsProcessingPlan(null);
    }
  }

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

        {/* Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs text-[var(--danger)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500 text-xs text-emerald-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
                      subscription?.status === "active"
                        ? "approved"
                        : subscription?.status === "grace"
                          ? "pending"
                          : "live"
                    }
                  >
                    {subscription?.status?.toUpperCase() || "TRIAL"}
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
              <Badge variant="neutral">Auto-Renewal (3-day grace)</Badge>
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
                <span className="font-mono font-bold text-[var(--text)] tabular-nums">
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
                <span className="font-mono font-bold text-[var(--text)] tabular-nums">
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
              Scale your print job volume as your customer base expands. Instant
              test activation with Razorpay.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AVAILABLE_PLANS.map((p) => {
              const isCurrent =
                (plan?.code || "growth").toLowerCase() === p.code.toLowerCase();
              const isProcessing = isProcessingPlan === p.planId;

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
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--accent-fill)] text-zinc-950 text-[10px] font-black uppercase tracking-wider extrude-accent-sm">
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
                      <span className="text-3xl font-black font-mono text-[var(--text)] tabular-nums">
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
                        disabled={isProcessingPlan !== null}
                        onClick={() => handleSelectPlan(p.planId, p.name)}
                        className="w-full text-xs font-bold flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <span>Select {p.name}</span>
                        )}
                      </Button3D>
                    )}
                  </div>
                </Card3D>
              );
            })}
          </div>
        </div>

        {/* Invoices & Payment History Section */}
        <div className="space-y-4 pt-6 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[var(--accent)]" />
                Payment History &amp; Receipts
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                All charges and subscription payments in INR with downloadable
                receipts.
              </p>
            </div>
          </div>

          <Card3D className="overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                No past transactions recorded yet. When you upgrade your plan,
                official receipts will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Receipt</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {history.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[var(--surface-2)]/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[var(--text)]">
                          {item.receiptNumber}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">
                          {new Date(item.createdAt).toLocaleDateString([], {
                            dateStyle: "medium",
                          })}
                        </td>
                        <td className="py-3 px-4 text-[var(--text)] font-medium">
                          {item.kind === "merchant_plan"
                            ? "Merchant Plan Subscription"
                            : item.kind === "job"
                              ? "Print Job Order"
                              : "Subscription Plan"}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[var(--text)] text-right tabular-nums">
                          ₹{item.amountRupees}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              item.status === "paid"
                                ? "approved"
                                : item.status === "refunded"
                                  ? "live"
                                  : "neutral"
                            }
                            size="sm"
                          >
                            {item.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setActiveReceipt(item)}
                            className="text-[var(--accent)] hover:underline font-semibold"
                          >
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card3D>
        </div>

        {/* Modal: View Receipt */}
        {activeReceipt && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <Card3D className="max-w-md w-full p-6 space-y-6 relative bg-[var(--surface)]">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[var(--accent)]" />
                  <h3 className="text-base font-extrabold text-[var(--text)]">
                    Payment Receipt
                  </h3>
                </div>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">
                    Receipt Number
                  </span>
                  <span className="font-mono font-bold text-[var(--text)]">
                    {activeReceipt.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">
                    Date &amp; Time
                  </span>
                  <span className="text-[var(--text)]">
                    {new Date(activeReceipt.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Order ID</span>
                  <span className="font-mono text-[var(--text-muted)]">
                    {activeReceipt.razorpayOrderId || "N/A"}
                  </span>
                </div>
                {activeReceipt.razorpayPaymentId && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Payment ID</span>
                    <span className="font-mono text-[var(--text-muted)]">
                      {activeReceipt.razorpayPaymentId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Status</span>
                  <span className="font-bold uppercase text-emerald-400">
                    {activeReceipt.status}
                  </span>
                </div>
                <div className="pt-3 border-t border-[var(--border)] flex justify-between items-baseline">
                  <span className="text-sm font-bold text-[var(--text)]">
                    Total Paid
                  </span>
                  <span className="text-xl font-mono font-black text-[var(--text)] tabular-nums">
                    ₹{activeReceipt.amountRupees}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button3D
                  variant="primary"
                  size="sm"
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </Button3D>
                <Button3D
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveReceipt(null)}
                  className="w-full"
                >
                  Close
                </Button3D>
              </div>
            </Card3D>
          </div>
        )}
      </div>
    </MerchantShell>
  );
}
