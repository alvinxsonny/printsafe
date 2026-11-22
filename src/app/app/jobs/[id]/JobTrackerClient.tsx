"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Store,
  Clock,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Phone,
  FileText,
  CreditCard,
  Loader2,
  ShieldCheck,
  Receipt,
  Printer,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Card3D, Button3D, Badge, Modal } from "@/components/ui";
import { openRazorpayCheckout } from "@/lib/payments/client";
import { FootprintTreeCard } from "@/components/tree";

interface JobDetail {
  id: string;
  mode: "near" | "far";
  status:
    | "requested"
    | "accepted"
    | "awaiting_payment"
    | "paid"
    | "unlocked"
    | "printed"
    | "completed"
    | "rejected"
    | "cancelled"
    | "expired";
  settings: {
    pages: string;
    copies: number;
    color: boolean;
    duplex: boolean;
    paper_size: string;
    orientation?: string;
  };
  sheets: number;
  quotePaise: number;
  passcode: string | null;
  codeExpiresAt: string | null;
  codeAttempts: number;
  unlockedUntil: string | null;
  requestedAt: string;
  acceptedAt: string | null;
  paidAt: string | null;
  printedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  shop: {
    id: string;
    name: string;
    address: string;
    locality: string | null;
    city: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
  };
  document: {
    id: string;
    name: string;
    pageCount: number;
  };
  customerFootprint?: {
    sheetsPrintedTotal: number;
  } | null;
}

export function JobTrackerClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Actions state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchJobData = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
      } else if (res.status === 404) {
        setJob(null);
      }
    } catch (err) {
      console.warn("Failed to fetch job:", err);
    }
  }, [jobId]);

  // Initial and reactive fetch
  useEffect(() => {
    let ignore = false;

    async function loadInitial() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!ignore && res.ok) {
          const data = await res.json();
          setJob(data.job);
        } else if (!ignore && res.status === 404) {
          setJob(null);
        }
      } catch (err) {
        console.warn("Failed to load initial job:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadInitial();

    // 5-second polling while tab is visible and job is active
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchJobData();
      }
    }, 5000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [jobId, fetchJobData]);

  // 1-second timer tick for countdown displays
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle Copy Passcode
  function handleCopyPasscode() {
    if (!job?.passcode) return;
    navigator.clipboard.writeText(job.passcode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  // Handle Cancel Request
  async function handleCancelConfirm() {
    setIsCancelling(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel request.");
      }

      setShowCancelModal(false);
      void fetchJobData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed";
      setActionError(msg);
    } finally {
      setIsCancelling(false);
    }
  }

  // Handle Regenerate Passcode
  async function handleRegenerateCode() {
    setIsRegenerating(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/regenerate-code`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to regenerate passcode.");
      }

      void fetchJobData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Regeneration failed";
      setActionError(msg);
    } finally {
      setIsRegenerating(false);
    }
  }

  // Handle Razorpay Payment for Far Mode
  async function handlePayJob() {
    if (!job) return;
    setIsPaying(true);
    setPaymentError(null);

    try {
      const resOrder = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "job",
          refId: jobId,
        }),
      });

      const orderData = await resOrder.json();
      if (!resOrder.ok) {
        throw new Error(orderData.error || "Failed to create payment order.");
      }

      await openRazorpayCheckout({
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || "INR",
        name: "PrintSafe Print Order",
        description: `Order #${job.id.slice(-6).toUpperCase()} Payment`,
        order_id: orderData.orderId,
        handler: async (response) => {
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

            await fetchJobData();
          } catch (vErr) {
            setPaymentError(
              vErr instanceof Error
                ? vErr.message
                : "Payment verification failed."
            );
          } finally {
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
          },
        },
        theme: {
          color: "#E5A93C",
        },
      });
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Payment initialization failed."
      );
      setIsPaying(false);
    }
  }

  if (isLoading) {
    return (
      <CustomerShell userAlias="Job Tracker">
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-xs text-[var(--text-muted)] font-semibold">
            Connecting to secure job tracker...
          </p>
        </div>
      </CustomerShell>
    );
  }

  if (!job) {
    return (
      <CustomerShell userAlias="Job Tracker">
        <div className="max-w-md mx-auto p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[var(--danger)] mx-auto" />
          <h2 className="text-base font-bold">Print Job Not Found</h2>
          <p className="text-xs text-[var(--text-muted)]">
            This job could not be located or may not belong to your account.
          </p>
          <Link href="/app/jobs">
            <Button3D variant="secondary" size="sm">
              Return to My Orders
            </Button3D>
          </Link>
        </div>
      </CustomerShell>
    );
  }

  // Calculate timers
  const now = currentTime > 0 ? currentTime : 0;

  // Expiry countdown for requested status
  let requestSecondsLeft = 0;
  if (job.status === "requested" && job.expiresAt) {
    requestSecondsLeft = Math.max(
      0,
      Math.floor((new Date(job.expiresAt).getTime() - now) / 1000)
    );
  }

  // Passcode expiry countdown
  let codeSecondsLeft = 0;
  let isCodeExpired = false;
  if (job.codeExpiresAt) {
    codeSecondsLeft = Math.max(
      0,
      Math.floor((new Date(job.codeExpiresAt).getTime() - now) / 1000)
    );
    isCodeExpired = codeSecondsLeft === 0;
  }

  const isCodeLocked = job.codeAttempts >= 3;

  // Stepper timeline definition
  const steps = [
    { label: "Requested", status: "requested" },
    {
      label: job.mode === "far" ? "Accepted / Pay" : "Accepted",
      status: job.mode === "far" ? "awaiting_payment" : "accepted",
    },
    { label: "Printing", status: "unlocked" },
    { label: "Ready", status: "printed" },
    { label: "Completed", status: "completed" },
  ];

  function getStepIndex(status: JobDetail["status"]): number {
    switch (status) {
      case "requested":
        return 0;
      case "accepted":
      case "awaiting_payment":
      case "paid":
        return 1;
      case "unlocked":
        return 2;
      case "printed":
        return 3;
      case "completed":
        return 4;
      default:
        return -1;
    }
  }

  const currentStepIdx = getStepIndex(job.status);
  const isTerminal = ["rejected", "cancelled", "expired"].includes(job.status);

  return (
    <CustomerShell userAlias="Job Tracker">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <Link
            href="/app/jobs"
            className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            All Orders
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              Job ID: {job.id.slice(0, 12)}...
            </span>
            <Badge
              variant={
                job.status === "accepted" ||
                job.status === "unlocked" ||
                job.status === "printed"
                  ? "live"
                  : job.status === "requested"
                    ? "pending"
                    : isTerminal
                      ? "rejected"
                      : "neutral"
              }
              size="sm"
            >
              {job.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Global Action Error */}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs text-[var(--danger)] font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Timeline Stepper */}
        {!isTerminal ? (
          <Card3D className="p-5 bg-[var(--surface-2)]">
            <div className="relative flex items-center justify-between">
              {steps.map((step, idx) => {
                const isPassed = currentStepIdx > idx;
                const isCurrent = currentStepIdx === idx;

                return (
                  <div
                    key={step.status}
                    className="flex flex-col items-center text-center relative z-10 flex-1"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isPassed
                          ? "bg-[var(--accent)] text-white"
                          : isCurrent
                            ? "bg-[var(--accent-fill)] border-2 border-[var(--accent-fill-darker)] text-zinc-950 font-black animate-pulse"
                            : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]"
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] font-bold mt-1.5 ${
                        isCurrent
                          ? "text-[var(--text)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card3D>
        ) : (
          <Card3D className="p-5 bg-[var(--danger-fill)]/10 border border-[var(--danger)] text-center space-y-1">
            <h3 className="text-sm font-bold text-[var(--danger)] capitalize">
              Order {job.status}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {job.status === "cancelled"
                ? "You cancelled this print request."
                : job.status === "rejected"
                  ? "The shop was unable to accept this request."
                  : "The request timed out after remaining unanswered."}
            </p>
          </Card3D>
        )}

        {/* Handover Code Prominent Display (When Accepted / Unlocked) */}
        {job.passcode &&
          (job.status === "accepted" || job.status === "unlocked") && (
            <Card3D className="p-6 bg-[var(--surface)] border-2 border-[var(--accent)] text-center space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  {job.status === "unlocked"
                    ? "Verified Handover Passcode"
                    : "Your Handover Passcode"}
                </span>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                  Show or tell this 4-digit code to the shopkeeper at the
                  counter to unlock and print your document.
                </p>
              </div>

              {/* 4-Digit Big Digits Box */}
              <div className="flex items-center justify-center gap-3 py-2">
                {job.passcode.split("").map((digit, idx) => (
                  <span
                    key={idx}
                    className="w-14 h-18 sm:w-16 sm:h-20 rounded-2xl bg-[var(--surface-2)] border-2 border-[var(--border)] text-3xl sm:text-4xl font-black font-mono flex items-center justify-center text-[var(--text)] extrude-sm select-all"
                  >
                    {digit}
                  </span>
                ))}
              </div>

              {/* Code Actions & Countdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-3 pt-2">
                <Button3D
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyPasscode}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-[var(--accent)]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {isCopied ? "Passcode Copied!" : "Copy Passcode"}
                </Button3D>

                {/* Code Expiry or Locked warning */}
                {isCodeLocked ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--danger)] font-bold">
                      Code locked (3 wrong attempts)
                    </span>
                    <Button3D
                      variant="primary"
                      size="sm"
                      onClick={handleRegenerateCode}
                      disabled={isRegenerating}
                      className="text-xs font-bold"
                    >
                      Regenerate Code
                    </Button3D>
                  </div>
                ) : isCodeExpired ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--warm)] font-bold">
                      Passcode expired
                    </span>
                    <Button3D
                      variant="primary"
                      size="sm"
                      onClick={handleRegenerateCode}
                      disabled={isRegenerating}
                      className="text-xs font-bold"
                    >
                      Regenerate Code
                    </Button3D>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-[var(--text-muted)] flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Expires in{" "}
                    <strong>
                      {Math.floor(codeSecondsLeft / 60)}:
                      {String(codeSecondsLeft % 60).padStart(2, "0")}
                    </strong>
                  </span>
                )}
              </div>
            </Card3D>
          )}

        {/* Waiting on Acceptance Banner */}
        {job.status === "requested" && (
          <Card3D className="p-5 border border-[var(--warm)]/50 bg-[var(--warm-fill)]/10 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--warm)]" />
                  <h3 className="text-sm font-bold text-[var(--text)]">
                    Waiting for Shop Acceptance
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  The shop has been notified of your request. This request
                  expires automatically if unanswered within{" "}
                  <strong>
                    {Math.floor(requestSecondsLeft / 60)}:
                    {String(requestSecondsLeft % 60).padStart(2, "0")}
                  </strong>
                  .
                </p>
              </div>

              <Button3D
                variant="danger"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="shrink-0 text-xs font-bold"
              >
                Cancel Request
              </Button3D>
            </div>
          </Card3D>
        )}

        {/* Payment Error Alert */}
        {paymentError && (
          <div className="p-4 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs text-[var(--danger)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{paymentError}</span>
            </div>
            <button
              onClick={() => setPaymentError(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Far Mode Payment Banner */}
        {job.mode === "far" && job.status === "awaiting_payment" && (
          <Card3D className="p-6 bg-[var(--surface)] border-2 border-[var(--accent)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[var(--text)]">
                    Payment Required to Unlock Queue
                  </h3>
                  <Badge variant="live">Awaiting Payment</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  The merchant has accepted your request. Complete payment of ₹
                  {(job.quotePaise / 100).toFixed(2)} via Razorpay to release
                  document for printing.
                </p>
              </div>

              <Button3D
                variant="primary"
                size="md"
                disabled={isPaying}
                onClick={handlePayJob}
                className="flex items-center gap-2 text-xs font-bold shrink-0"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span className="font-mono tabular-nums">
                      Pay ₹{(job.quotePaise / 100).toFixed(2)}
                    </span>
                  </>
                )}
              </Button3D>
            </div>
          </Card3D>
        )}

        {/* Paid Receipt Banner */}
        {["paid", "unlocked", "printed", "completed"].includes(job.status) && (
          <Card3D className="p-4 bg-[var(--surface-2)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[var(--text)]">
                    Payment Received
                  </h4>
                  <Badge variant="approved">
                    ₹{(job.quotePaise / 100).toFixed(2)}
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  Receipt: PS-JOB-{job.id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>
            <Button3D
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-bold shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </Button3D>
          </Card3D>
        )}

        {/* Paper Footprint Impact Tree on Job Completion (Phase 14 Task 3) */}
        {job.status === "completed" && (
          <FootprintTreeCard
            sheetsPrintedTotal={
              job.customerFootprint?.sheetsPrintedTotal ?? job.sheets
            }
          />
        )}

        {/* Order Details & Shop Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Print Specification Card */}
          <Card3D className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <FileText className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                Order Specification
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Document</span>
                <span className="font-bold text-[var(--text)] truncate max-w-[180px]">
                  {job.document.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Pages in Range</span>
                <span className="font-mono font-bold text-[var(--text)]">
                  {job.settings.pages}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Copies</span>
                <span className="font-mono font-bold text-[var(--text)]">
                  {job.settings.copies}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Color Mode</span>
                <span className="font-bold text-[var(--text)]">
                  {job.settings.color ? "Colour" : "Black & White"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Sides</span>
                <span className="font-bold text-[var(--text)]">
                  {job.settings.duplex ? "2-Sided (Duplex)" : "1-Sided"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Paper Size</span>
                <span className="font-bold text-[var(--text)]">
                  {job.settings.paper_size}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Total Sheets</span>
                <span className="font-mono font-bold text-[var(--text)]">
                  {job.sheets} sheets
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold pt-1">
                <span>Total Amount</span>
                <span className="font-mono text-[var(--accent)]">
                  ₹{(job.quotePaise / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </Card3D>

          {/* Print Shop Contact Card */}
          <Card3D className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <Store className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                Print Shop Location
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-bold text-[var(--text)]">
                  {job.shop.name}
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  {job.shop.address}, {job.shop.locality || job.shop.city}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                {job.shop.latitude && job.shop.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${job.shop.latitude},${job.shop.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button3D
                      variant="secondary"
                      size="sm"
                      className="w-full flex items-center justify-center gap-1.5 text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Get Directions
                    </Button3D>
                  </a>
                )}

                {job.shop.phone && (
                  <a href={`tel:${job.shop.phone}`} className="shrink-0">
                    <Button3D
                      variant="secondary"
                      size="sm"
                      className="flex items-center justify-center text-xs"
                      title="Call Store"
                    >
                      <Phone className="w-3.5 h-3.5 text-[var(--accent)]" />
                    </Button3D>
                  </a>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-2)] text-[11px] text-[var(--text-muted)] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                <p>
                  Zero-trust security: the shop cannot download or forward your
                  document. Pages are decrypted only into a sandboxed viewer.
                </p>
              </div>
            </div>
          </Card3D>
        </div>

        {/* Cancel Confirmation Modal */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title="Cancel Print Request"
        >
          <div className="space-y-4 text-xs">
            <p className="text-[var(--text)]">
              Are you sure you want to cancel this print request?
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--text-muted)]">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Uploaded wrong document, found another shop"
                className="w-full h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button3D
                variant="secondary"
                size="sm"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Request
              </Button3D>
              <Button3D
                variant="danger"
                size="sm"
                onClick={handleCancelConfirm}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </Button3D>
            </div>
          </div>
        </Modal>
      </div>
    </CustomerShell>
  );
}
