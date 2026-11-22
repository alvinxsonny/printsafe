"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Printer,
  ChevronLeft,
  Clock,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Lock,
  Loader2,
  Check,
} from "lucide-react";
import { MerchantShell } from "@/components/layout/MerchantShell";
import { Card3D, Button3D, Badge, Modal, Input } from "@/components/ui";

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
    pages?: string;
    copies?: number;
    color?: boolean;
    duplex?: boolean;
    paper_size?: string;
  };
  sheets: number;
  quotePaise: number;
  codeAttempts: number;
  isLocked: boolean;
  isCodeExpired: boolean;
  codeExpiresAt: string | null;
  unlockedUntil: string | null;
  requestedAt: string;
  acceptedAt: string | null;
  paidAt: string | null;
  printedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  customerAlias: string;
  pageCount: number;
}

export function MerchantJobDetailClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Passcode verification state
  const [passcodeInput, setPasscodeInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Action states
  const [isAccepting, setIsAccepting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/merchant/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
      } else if (res.status === 404) {
        setJob(null);
      }
    } catch (err) {
      console.warn("Failed to fetch merchant job:", err);
    }
  }, [jobId]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch(`/api/merchant/jobs/${jobId}`);
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

    void init();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchJob();
      }
    }, 5000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [jobId, fetchJob]);

  // 1-second timer tick for countdown displays
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Accept Action
  async function handleAccept() {
    setIsAccepting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/merchant/jobs/${jobId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept job.");
      void fetchJob();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Accept failed";
      setActionError(msg);
    } finally {
      setIsAccepting(false);
    }
  }

  // Reject Action
  async function handleRejectConfirm() {
    setIsRejecting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/merchant/jobs/${jobId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject job.");
      setShowRejectModal(false);
      void fetchJob();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reject failed";
      setActionError(msg);
    } finally {
      setIsRejecting(false);
    }
  }

  // Passcode Verification Action
  async function handleVerifyPasscode(e: React.FormEvent) {
    e.preventDefault();
    if (!passcodeInput || passcodeInput.length !== 4) {
      setVerifyError("Please enter the complete 4-digit code.");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch(`/api/merchant/jobs/${jobId}/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: passcodeInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Incorrect passcode.");
      }
      setPasscodeInput("");
      void fetchJob();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setVerifyError(msg);
    } finally {
      setIsVerifying(false);
    }
  }

  if (isLoading) {
    return (
      <MerchantShell shopName="Job Detail">
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-xs text-[var(--text-muted)] font-semibold">
            Loading secure job details...
          </p>
        </div>
      </MerchantShell>
    );
  }

  if (!job) {
    return (
      <MerchantShell shopName="Job Detail">
        <div className="max-w-md mx-auto p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[var(--danger)] mx-auto" />
          <h2 className="text-base font-bold">Print Order Not Found</h2>
          <p className="text-xs text-[var(--text-muted)]">
            This job could not be found or does not belong to your print shop.
          </p>
          <Link href="/merchant/queue">
            <Button3D variant="secondary" size="sm">
              Return to Print Queue
            </Button3D>
          </Link>
        </div>
      </MerchantShell>
    );
  }

  const now = currentTime > 0 ? currentTime : 0;

  // Countdown for requested state (10m expiry)
  let requestSecondsLeft = 0;
  if (job.status === "requested" && job.expiresAt && now > 0) {
    requestSecondsLeft = Math.max(
      0,
      Math.floor((new Date(job.expiresAt).getTime() - now) / 1000)
    );
  }

  // Countdown for unlocked window
  let unlockSecondsLeft = 0;
  if (job.status === "unlocked" && job.unlockedUntil && now > 0) {
    unlockSecondsLeft = Math.max(
      0,
      Math.floor((new Date(job.unlockedUntil).getTime() - now) / 1000)
    );
  }

  return (
    <MerchantShell shopName="Job Inspection">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <Link
            href="/merchant/queue"
            className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Queue
          </Link>
          <Badge
            variant={
              job.status === "requested"
                ? "live"
                : job.status === "unlocked"
                  ? "live"
                  : job.status === "completed"
                    ? "approved"
                    : job.status === "rejected" || job.status === "cancelled"
                      ? "rejected"
                      : "info"
            }
            size="sm"
          >
            {job.status.toUpperCase()}
          </Badge>
        </div>

        {/* Global Action Error */}
        {actionError && (
          <div className="p-4 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs text-[var(--danger)] font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Privacy Notice Banner */}
        <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--text-muted)] leading-relaxed">
            <span className="font-extrabold text-[var(--text)] block mb-0.5">
              Zero-Trust Privacy Standard Enforced
            </span>
            Original document file names, storage keys, customer phone numbers,
            and email addresses are strictly hidden to prevent data leaks. Print
            instructions and viewable pages are unlocked only with explicit
            customer authorization.
          </div>
        </div>

        {/* Main Job Overview Card */}
        <Card3D className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 extrude-sm">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-[var(--text)]">
                    {job.customerAlias}
                  </h2>
                  <Badge
                    variant={job.mode === "near" ? "neutral" : "info"}
                    size="sm"
                  >
                    {job.mode === "near"
                      ? "Walk-In (Near Mode)"
                      : "Pay & Collect (Far Mode)"}
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  Job ID: {job.id.slice(0, 16)} &bull; Requested:{" "}
                  {new Date(job.requestedAt).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Binding Rate Quote
              </span>
              <span className="text-2xl font-black font-mono text-[var(--accent)]">
                ₹{(job.quotePaise / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Print Specification Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-xs">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                Color Mode
              </span>
              <span className="font-bold text-[var(--text)]">
                {job.settings.color ? "Full Colour" : "Black & White"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                Duplex (Sides)
              </span>
              <span className="font-bold text-[var(--text)]">
                {job.settings.duplex ? "2-Sided (Duplex)" : "1-Sided (Simplex)"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                Total Output Sheets
              </span>
              <span className="font-bold text-[var(--text)]">
                {job.sheets} sheets ({job.pageCount} pgs &times;{" "}
                {job.settings.copies || 1} copies)
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                Page Range / Paper
              </span>
              <span className="font-bold text-[var(--text)]">
                {job.settings.pages || "all"} &bull;{" "}
                {job.settings.paper_size || "A4"}
              </span>
            </div>
          </div>

          {/* Interactive State Actions Container */}
          <div className="space-y-4 pt-2">
            {/* 1. Requested State: Accept or Reject */}
            {job.status === "requested" && (
              <div className="p-5 rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface-2)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--text)]">
                      Incoming Print Request
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Accepting this job confirms you can fulfill the order and
                      issues a 4-digit handover code to the customer.
                    </p>
                  </div>
                  {requestSecondsLeft > 0 && (
                    <span className="px-3 py-1 rounded-xl bg-[var(--warning-fill)]/20 border border-[var(--warning)] text-xs font-mono font-bold text-[var(--warning)] flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5" />
                      Expires in {Math.floor(requestSecondsLeft / 60)}:
                      {String(requestSecondsLeft % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button3D
                    variant="primary"
                    size="md"
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="flex items-center gap-2 font-bold"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isAccepting ? "Accepting..." : "Accept Print Request"}
                    </span>
                  </Button3D>

                  <Button3D
                    variant="danger"
                    size="md"
                    onClick={() => setShowRejectModal(true)}
                    disabled={isAccepting}
                    className="flex items-center gap-2 font-bold"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Decline Request</span>
                  </Button3D>
                </div>
              </div>
            )}

            {/* 2. Accepted / Paid State: Enter 4-digit code */}
            {(job.status === "accepted" || job.status === "paid") && (
              <div className="p-6 rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface-2)] space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--accent-fill)]/20 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-[var(--text)]">
                        Customer Handover Verification
                      </h3>
                      {job.status === "paid" && (
                        <Badge variant="live" size="sm">
                          ✓ Paid Online
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {job.status === "paid"
                        ? "Payment is confirmed. Enter the 4-digit code provided by the customer to unlock the document reader and print."
                        : "The customer is walking in. Ask them for the 4-digit code displayed on their phone tracker screen to unlock the document reader."}
                    </p>
                  </div>
                </div>

                {job.isLocked ? (
                  <div className="p-4 rounded-xl bg-[var(--danger-fill)]/20 border border-[var(--danger)] text-xs text-[var(--danger)] font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>
                      Job passcode is LOCKED after 3 incorrect attempts. The
                      customer must tap &quot;Regenerate Code&quot; on their
                      tracker.
                    </span>
                  </div>
                ) : job.isCodeExpired ? (
                  <div className="p-4 rounded-xl bg-[var(--warning-fill)]/20 border border-[var(--warning)] text-xs text-[var(--warning)] font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      Passcode has expired. The customer must tap
                      &quot;Regenerate Code&quot; on their phone.
                    </span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleVerifyPasscode}
                    className="space-y-3 pt-2"
                  >
                    {verifyError && (
                      <div className="p-3 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs text-[var(--danger)] font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {verifyError}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <Input
                        type="text"
                        maxLength={4}
                        value={passcodeInput}
                        onChange={(e) =>
                          setPasscodeInput(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="0 0 0 0"
                        className="w-44 text-center text-2xl font-black font-mono tracking-widest h-12"
                      />

                      <Button3D
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={isVerifying || passcodeInput.length !== 4}
                        className="flex items-center gap-2 font-bold h-12"
                      >
                        {isVerifying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>
                          {isVerifying
                            ? "Verifying..."
                            : "Verify & Unlock Reader"}
                        </span>
                      </Button3D>

                      <span className="text-[11px] text-[var(--text-muted)] font-mono">
                        {3 - job.codeAttempts} attempts remaining
                      </span>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 3. Unlocked State: Open Secure Viewer */}
            {job.status === "unlocked" && (
              <div className="p-6 rounded-2xl border-2 border-[#12724A] bg-[#12724A]/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#12724A]" />
                    <h3 className="text-sm font-black text-[var(--text)]">
                      Document Reader Unlocked &amp; Ready
                    </h3>
                  </div>
                  {unlockSecondsLeft > 0 && (
                    <span className="px-3 py-1 rounded-xl bg-[#12724A]/20 border border-[#12724A] text-xs font-mono font-bold text-[#12724A] flex items-center gap-1.5 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5" />
                      Window active: {Math.floor(unlockSecondsLeft / 60)}:
                      {String(unlockSecondsLeft % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  The zero-trust viewer renders privately with composite
                  security watermarks. Never take photographs of customer
                  documents.
                </p>

                <div className="pt-2">
                  <Link href={`/merchant/jobs/${job.id}/view`}>
                    <Button3D
                      variant="primary"
                      size="md"
                      className="flex items-center gap-2 font-bold bg-[#12724A] text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Launch Private Print Viewer</span>
                    </Button3D>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Card3D>

        {/* Reject Modal */}
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Decline Print Request"
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              Are you sure you want to decline this request? The customer will
              receive an immediate notification.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text)]">
                Reason for Rejection (Optional)
              </label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Out of 80gsm paper, queue full"
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button3D
                variant="secondary"
                size="sm"
                onClick={() => setShowRejectModal(false)}
                disabled={isRejecting}
              >
                Cancel
              </Button3D>
              <Button3D
                variant="danger"
                size="sm"
                onClick={handleRejectConfirm}
                disabled={isRejecting}
              >
                {isRejecting ? "Declining..." : "Confirm Rejection"}
              </Button3D>
            </div>
          </div>
        </Modal>
      </div>
    </MerchantShell>
  );
}
