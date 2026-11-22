"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Clock,
  Printer,
  CheckCircle2,
  XCircle,
  Key,
  Volume2,
  VolumeX,
  BellRing,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { MerchantShell } from "@/components/layout/MerchantShell";
import { Card3D, Button3D, Badge, Modal, Input } from "@/components/ui";

interface QueueJob {
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

export function MerchantQueueClient() {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [filter, setFilter] = useState<
    "all" | "pending" | "active" | "completed"
  >("all");
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Reject Modal
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Track seen IDs for sound chime
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Web Audio Chime generator
  const playAlertChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";

      const t = ctx.currentTime;
      // Gentle two-tone chime: 880Hz -> 1320Hz
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1320, t + 0.15);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.start(t);
      osc.stop(t + 0.5);
    } catch {
      // Audio autoplay may be restricted until user interacts with document
    }
  }, [soundEnabled]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`/api/merchant/jobs?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        const incomingJobs: QueueJob[] = data.jobs || [];

        // Check if there are brand new pending requests
        if (!initialLoadRef.current) {
          const hasNewPending = incomingJobs.some(
            (j) => j.status === "requested" && !seenIdsRef.current.has(j.id)
          );
          if (hasNewPending) {
            playAlertChime();
            setHasNewAlert(true);
            setTimeout(() => setHasNewAlert(false), 8000);
          }
        }

        // Update seen set
        incomingJobs.forEach((j) => seenIdsRef.current.add(j.id));
        initialLoadRef.current = false;
        setJobs(incomingJobs);
      }
    } catch (err) {
      console.warn("Failed to fetch merchant queue:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filter, playAlertChime]);

  // Initial and reactive polling
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch(`/api/merchant/jobs?filter=${filter}`);
        if (!ignore && res.ok) {
          const data = await res.json();
          const incomingJobs: QueueJob[] = data.jobs || [];
          incomingJobs.forEach((j) => seenIdsRef.current.add(j.id));
          initialLoadRef.current = false;
          setJobs(incomingJobs);
        }
      } catch (err) {
        console.warn("Failed to load initial queue:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void init();

    // 5-second polling while tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchJobs();
      }
    }, 5000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [filter, fetchJobs]);

  // 1-second interval for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Accept Action
  async function handleAccept(jobId: string) {
    try {
      setActionError(null);
      const res = await fetch(`/api/merchant/jobs/${jobId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to accept job.");
      }
      void fetchJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept";
      setActionError(msg);
    }
  }

  // Reject Action
  async function handleRejectConfirm() {
    if (!rejectingJobId) return;
    setIsRejecting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/merchant/jobs/${rejectingJobId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject job.");
      }
      setRejectingJobId(null);
      setRejectReason("");
      void fetchJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject";
      setActionError(msg);
    } finally {
      setIsRejecting(false);
    }
  }

  const now = currentTime > 0 ? currentTime : 0;
  const pendingCount = jobs.filter((j) => j.status === "requested").length;

  return (
    <MerchantShell shopName="Print Queue">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                Active Print Queue
              </h1>
              {hasNewAlert && (
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--danger)] text-white text-[10px] font-black animate-pulse flex items-center gap-1">
                  <BellRing className="w-3 h-3" /> NEW REQUEST
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Live incoming customer orders. Refreshes automatically every 5s.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1.5 transition-all select-none"
              title={
                soundEnabled ? "Disable audio chime" : "Enable audio chime"
              }
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-[var(--accent)]" />
                  <span>Sound ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>Sound OFF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Action Error Alert */}
        {actionError && (
          <div className="p-4 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs text-[var(--danger)] font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: "all", label: "All Orders" },
              { id: "pending", label: `Pending Requests (${pendingCount})` },
              { id: "active", label: "Active Processing" },
              { id: "completed", label: "Completed / History" },
            ] as const
          ).map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap select-none ${
                  isActive
                    ? "bg-[var(--accent-fill)] text-[#14213D] extrude-accent-sm font-black"
                    : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Queue List Content */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            <p className="text-xs text-[var(--text-muted)] font-semibold">
              Connecting to live queue...
            </p>
          </div>
        ) : jobs.length === 0 ? (
          <Card3D className="p-12 text-center space-y-3">
            <Layers className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-[var(--text)]">
              No orders found in this view
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              New customer print requests will appear here with an audio alert.
              Keep this tab open while your shop is live.
            </p>
          </Card3D>
        ) : (
          <div className="space-y-4">
            {jobs.map((j) => {
              // Expiry countdown for requested jobs
              let secondsLeft = 0;
              if (j.status === "requested" && j.expiresAt && now > 0) {
                secondsLeft = Math.max(
                  0,
                  Math.floor((new Date(j.expiresAt).getTime() - now) / 1000)
                );
              }

              return (
                <Card3D
                  key={j.id}
                  className={`p-5 space-y-4 border transition-all ${
                    j.status === "requested"
                      ? "border-2 border-[var(--accent)] bg-[var(--surface)] shadow-md"
                      : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 extrude-sm">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-[var(--text)]">
                            {j.customerAlias}
                          </h4>
                          <Badge
                            variant={j.mode === "near" ? "neutral" : "info"}
                            size="sm"
                          >
                            {j.mode === "near"
                              ? "Walk-In (Near)"
                              : "Pay & Collect (Far)"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                          Received{" "}
                          {new Date(j.requestedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {j.status === "requested" && secondsLeft > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--warning-fill)]/20 border border-[var(--warning)] text-[10px] font-mono font-bold text-[var(--warning)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor(secondsLeft / 60)}:
                          {String(secondsLeft % 60).padStart(2, "0")} left
                        </span>
                      )}

                      <Badge
                        variant={
                          j.status === "requested"
                            ? "live"
                            : j.status === "accepted"
                              ? "neutral"
                              : j.status === "unlocked"
                                ? "live"
                                : j.status === "completed"
                                  ? "approved"
                                  : j.status === "rejected" ||
                                      j.status === "cancelled"
                                    ? "rejected"
                                    : "info"
                        }
                        size="md"
                      >
                        {j.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Print Options & Binding Quote */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[var(--surface-2)] p-3 rounded-2xl">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                        Print Spec
                      </span>
                      <span className="font-bold text-[var(--text)]">
                        {j.settings.color ? "Colour" : "Black & White"} &bull;{" "}
                        {j.settings.duplex ? "2-Sided" : "1-Sided"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                        Volume
                      </span>
                      <span className="font-bold text-[var(--text)]">
                        {j.sheets} sheets ({j.pageCount} pgs &times;{" "}
                        {j.settings.copies || 1})
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                        Paper Size
                      </span>
                      <span className="font-bold text-[var(--text)]">
                        {j.settings.paper_size || "A4"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                        Binding Quote
                      </span>
                      <span className="font-black font-mono text-[var(--accent)] text-sm">
                        ₹{(j.quotePaise / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Queue Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {j.status === "requested"
                        ? "Review specs and accept to issue customer passcode."
                        : j.status === "accepted" && j.mode === "near"
                          ? "Customer is walking in. Ask for 4-digit code to unlock viewer."
                          : j.status === "unlocked"
                            ? "Viewer unlocked! Click below to launch the private print preview."
                            : "Job handled."}
                    </p>

                    <div className="flex items-center gap-2 shrink-0">
                      {j.status === "requested" && (
                        <>
                          <Button3D
                            variant="danger"
                            size="sm"
                            onClick={() => setRejectingJobId(j.id)}
                            className="flex items-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </Button3D>
                          <Button3D
                            variant="primary"
                            size="sm"
                            onClick={() => handleAccept(j.id)}
                            className="flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accept Request</span>
                          </Button3D>
                        </>
                      )}

                      {j.status === "accepted" && (
                        <Link href={`/merchant/jobs/${j.id}`}>
                          <Button3D
                            variant="primary"
                            size="sm"
                            className="flex items-center gap-1.5"
                          >
                            <Key className="w-4 h-4" />
                            <span>Enter Customer Code</span>
                          </Button3D>
                        </Link>
                      )}

                      {j.status === "unlocked" && (
                        <Link href={`/merchant/jobs/${j.id}/view`}>
                          <Button3D
                            variant="primary"
                            size="sm"
                            className="flex items-center gap-1.5 bg-[#12724A] text-white"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Open Viewer</span>
                          </Button3D>
                        </Link>
                      )}

                      <Link href={`/merchant/jobs/${j.id}`}>
                        <Button3D
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <span>View Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button3D>
                      </Link>
                    </div>
                  </div>
                </Card3D>
              );
            })}
          </div>
        )}

        {/* Reject Modal */}
        <Modal
          isOpen={Boolean(rejectingJobId)}
          onClose={() => setRejectingJobId(null)}
          title="Reject Print Request"
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              Are you sure you want to decline this print request? The customer
              will be notified immediately.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text)]">
                Reason for Rejection (Optional)
              </label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Printer out of colour toner, queue busy"
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button3D
                variant="secondary"
                size="sm"
                onClick={() => setRejectingJobId(null)}
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
