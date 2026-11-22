"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Printer,
  ChevronLeft,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button3D, Badge, Modal } from "@/components/ui";
import {
  fetchPdfBytes,
  loadPdfDocument,
  renderPageToDataUrl,
} from "@/lib/pdf/client-render";

interface ViewerSession {
  id: string;
  mode: "near" | "far";
  status: string;
  settings: {
    pages?: string;
    copies?: number;
    color?: boolean;
    duplex?: boolean;
    paper_size?: string;
  };
  sheets: number;
  quotePaise: number;
  unlockedUntil: string;
  openCount: number;
  maxReopens: number;
  customerAlias: string;
  pageCount: number;
  requestedPages: number[];
  deleteAfterPrint: boolean;
}

export function SecureViewerClient({ jobId }: { jobId: string }) {
  const router = useRouter();

  const [session, setSession] = useState<ViewerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Printing state
  const [isPrinting, setIsPrinting] = useState(false);
  const [isMarkingPrinted, setIsMarkingPrinted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>("unlocked");
  const [showMarkPrintedConfirm, setShowMarkPrintedConfirm] = useState(false);

  // Loaded page image URLs for screen & print rendering
  const [pageBlobs, setPageBlobs] = useState<Record<number, string>>({});
  const [loadingPages, setLoadingPages] = useState<Record<number, boolean>>({});
  const [pageErrors, setPageErrors] = useState<Record<number, string>>({});

  // 1. Fetch Session Data
  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const res = await fetch(`/api/viewer/${jobId}/session`);
        const data = await res.json();

        if (!ignore && res.ok) {
          setSession(data.session);
          setJobStatus(data.session.status);
        } else if (!ignore) {
          setErrorMessage(
            data.error || "Failed to load secure viewer session."
          );
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Access denied";
          setErrorMessage(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      ignore = true;
    };
  }, [jobId]);

  // 2. 1-second timer tick for countdown displays
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Security Deterrents: Keyboard shortcuts & right-click
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Prevent Save shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        return false;
      }

      // Prevent View Source
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        return false;
      }

      // Intercept Print shortcut (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        handleTriggerPrint();
        return false;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 4. Load Pages — fetch raw PDF once, render each page client-side with PDF.js
  const pdfDocRef = useRef<unknown>(null);
  const pdfLoadingRef = useRef<Promise<void> | null>(null);
  const loadedPagesRef = useRef<Set<number>>(new Set());
  const inFlightPagesRef = useRef<Set<number>>(new Set());

  async function ensurePdfLoaded(jId: string): Promise<void> {
    if (pdfDocRef.current) return;
    if (pdfLoadingRef.current) {
      await pdfLoadingRef.current;
      return;
    }
    pdfLoadingRef.current = (async () => {
      const bytes = await fetchPdfBytes(`/api/viewer/${jId}/pdf`);
      pdfDocRef.current = await loadPdfDocument(bytes);
    })();
    await pdfLoadingRef.current;
  }

  const loadSinglePage = React.useCallback(
    async (p: number) => {
      if (inFlightPagesRef.current.has(p)) return;
      inFlightPagesRef.current.add(p);
      setLoadingPages((prev) => ({ ...prev, [p]: true }));
      setPageErrors((prev) => {
        const next = { ...prev };
        delete next[p];
        return next;
      });

      try {
        await ensurePdfLoaded(jobId);
        const dataUrl = await renderPageToDataUrl(pdfDocRef.current, p, 2.0);
        loadedPagesRef.current.add(p);
        setPageBlobs((prev) => ({ ...prev, [p]: dataUrl }));
      } catch (err: unknown) {
        console.warn(`Failed loading page ${p}:`, err);
        const msg =
          err instanceof Error ? err.message : `Failed to load page ${p}`;
        setPageErrors((prev) => ({ ...prev, [p]: msg }));
      } finally {
        inFlightPagesRef.current.delete(p);
        setLoadingPages((prev) => ({ ...prev, [p]: false }));
      }
    },
    [jobId]
  );

  // Trigger page loading whenever session.requestedPages is available
  useEffect(() => {
    if (!session?.requestedPages || session.requestedPages.length === 0) return;

    for (const p of session.requestedPages) {
      if (!loadedPagesRef.current.has(p) && !inFlightPagesRef.current.has(p)) {
        void loadSinglePage(p);
      }
    }
  }, [session?.requestedPages, loadSinglePage]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(pageBlobs).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
    };
  }, [pageBlobs]);

  // Handle Print Action
  function handleTriggerPrint() {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 250);
  }

  // Handle Mark Printed
  async function handleMarkPrintedConfirm() {
    setIsMarkingPrinted(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/merchant/jobs/${jobId}/mark-printed`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark printed.");
      }

      setJobStatus("printed");
      setShowMarkPrintedConfirm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to mark printed";
      setErrorMessage(msg);
    } finally {
      setIsMarkingPrinted(false);
    }
  }

  // Handle Complete Job
  async function handleCompleteJob() {
    setIsCompleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/merchant/jobs/${jobId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete job.");
      }

      router.push("/merchant/queue");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete";
      setErrorMessage(msg);
      setIsCompleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="dark min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
        <p className="text-xs text-[var(--text-muted)] font-semibold">
          Verifying security authorization &amp; loading pages...
        </p>
      </div>
    );
  }

  if (errorMessage && !session) {
    return (
      <div className="dark min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--danger-fill)]/15 border border-[var(--danger)]/30 flex items-center justify-center text-[var(--danger)] mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black tracking-tight text-[var(--text)]">
          Access Prohibited
        </h2>
        <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
          {errorMessage}
        </p>
        <Link href={`/merchant/jobs/${jobId}`}>
          <Button3D variant="secondary" size="sm">
            Return to Job Details
          </Button3D>
        </Link>
      </div>
    );
  }

  const now = currentTime > 0 ? currentTime : 0;
  let secondsLeft = 0;
  if (session?.unlockedUntil && now > 0) {
    secondsLeft = Math.max(
      0,
      Math.floor((new Date(session.unlockedUntil).getTime() - now) / 1000)
    );
  }

  const isExpired = secondsLeft === 0 && jobStatus === "unlocked";

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="dark min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col select-none relative"
    >
      {/* Access Expired Screen */}
      {isExpired && (
        <div className="print:hidden fixed inset-0 z-40 bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-[var(--warm-fill)]/20 border border-[var(--warm)]/40 flex items-center justify-center text-[var(--warm)] mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black tracking-tight text-[var(--text)]">
            Viewing Window Expired
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md leading-relaxed">
            The viewing window has ended. To inspect or print again, the
            customer must tap &quot;Regenerate Code&quot; on their phone to
            issue a fresh passcode.
          </p>
          <Link href={`/merchant/jobs/${jobId}`}>
            <Button3D variant="primary" size="sm">
              <span className="text-zinc-950 font-black">
                Enter Regenerated Code on Job Details
              </span>
            </Button3D>
          </Link>
        </div>
      )}

      {/* Top Fixed Control Bar (Screen Only - Hidden in Print) */}
      <header className="print:hidden sticky top-0 z-30 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <Link
            href={`/merchant/jobs/${jobId}`}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-all flex items-center justify-center"
            title="Exit viewer"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-[var(--text)]">
                {session?.customerAlias}
              </h1>
              <Badge variant="live" size="sm">
                READER UNLOCKED
              </Badge>
              {session?.deleteAfterPrint && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--danger-fill)]/20 border border-[var(--danger)]/40 text-[10px] font-bold text-[var(--danger)]">
                  AUTO-DELETE ON PRINT
                </span>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
              Job #{jobId.slice(0, 8)} &bull; {session?.requestedPages.length}{" "}
              pages &bull; Reopen #{session?.openCount}
            </p>
          </div>
        </div>

        {/* Live Countdown & Action Buttons */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-2 text-xs font-mono">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            <span
              className={`font-black ${
                secondsLeft <= 120
                  ? "text-[var(--warm)] animate-pulse"
                  : "text-[var(--accent)]"
              }`}
            >
              {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")} left
            </span>
          </div>

          {jobStatus === "unlocked" && (
            <>
              <Button3D
                variant="primary"
                size="sm"
                onClick={handleTriggerPrint}
                disabled={isPrinting}
                className="flex items-center gap-1.5 font-bold"
              >
                <Printer className="w-4 h-4 text-zinc-950" />
                <span className="text-zinc-950 font-black">
                  {isPrinting ? "Opening..." : "Print Document"}
                </span>
              </Button3D>

              <Button3D
                variant="secondary"
                size="sm"
                onClick={() => setShowMarkPrintedConfirm(true)}
                disabled={isMarkingPrinted}
                className="flex items-center gap-1.5 font-bold"
              >
                <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                <span>Mark Printed</span>
              </Button3D>
            </>
          )}

          {jobStatus === "printed" && (
            <Button3D
              variant="primary"
              size="sm"
              onClick={handleCompleteJob}
              disabled={isCompleting}
              className="flex items-center gap-1.5 font-bold"
            >
              <CheckCircle2 className="w-4 h-4 text-zinc-950" />
              <span className="text-zinc-950 font-black">
                {isCompleting ? "Completing..." : "Mark Completed"}
              </span>
            </Button3D>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Print Instructions Card (Screen Only) */}
        <div className="print:hidden p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
                Printer Hardware Settings Checklist
              </h2>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              Rate Quote: ₹{((session?.quotePaise || 0) / 100).toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                Copies
              </span>
              <span className="text-sm font-black font-mono text-[var(--text)]">
                {session?.settings.copies || 1}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                Color Mode
              </span>
              <span className="text-sm font-black text-[var(--text)]">
                {session?.settings.color ? "Colour" : "Black & White"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                Paper Sides
              </span>
              <span className="text-sm font-black text-[var(--text)]">
                {session?.settings.duplex ? "2-Sided (Duplex)" : "1-Sided"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
                Paper Size
              </span>
              <span className="text-sm font-black text-[var(--text)]">
                {session?.settings.paper_size || "A4"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--warm)] bg-[var(--warm-fill)]/15 border border-[var(--warm)]/30 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>
              Browsers cannot preset your printer hardware dialog. Please ensure
              your physical printer settings match the checklist above before
              printing.
            </p>
          </div>
        </div>

        {/* Security Confidentiality Notice (Screen Only) */}
        <div className="print:hidden flex items-center justify-center gap-2 text-center text-xs text-[var(--text-muted)] py-1">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
          <span>
            This document is private. Page viewing is logged in real-time. Do
            not photograph or copy.
          </span>
        </div>

        {/* Canvases View (Screen Display) */}
        <div className="print:hidden space-y-6">
          {session?.requestedPages.map((pageNo) => {
            const isPageLoading = loadingPages[pageNo] && !pageBlobs[pageNo];
            const pageError = pageErrors[pageNo];
            const hasBlob = !!pageBlobs[pageNo];

            return (
              <div
                key={pageNo}
                className="bg-[var(--surface)] rounded-2xl shadow-xl overflow-hidden border border-[var(--border)] mx-auto max-w-2xl relative"
              >
                <div className="bg-[var(--surface-2)] border-b border-[var(--border)] px-4 py-2 flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
                  <span className="font-bold text-[var(--text)]">
                    Page {pageNo}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[var(--accent)] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Watermarked Zero-Trust View
                  </span>
                </div>

                {isPageLoading && (
                  <div className="h-96 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                    <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" />
                    <span className="text-xs font-semibold text-[var(--text)]">
                      Loading page {pageNo}...
                    </span>
                  </div>
                )}

                {pageError && !hasBlob && (
                  <div className="h-96 flex flex-col items-center justify-center gap-3 text-[var(--danger)] p-6 text-center">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-xs font-semibold">{pageError}</p>
                    <Button3D
                      size="sm"
                      variant="secondary"
                      onClick={() => void loadSinglePage(pageNo)}
                    >
                      Retry Loading Page
                    </Button3D>
                  </div>
                )}

                {hasBlob && (
                  <div className="relative flex justify-center p-4 bg-black/25 overflow-hidden">
                    {/* Clean rendered page */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pageBlobs[pageNo]}
                      alt={`Page ${pageNo} - Document Preview`}
                      className="max-w-full h-auto shadow-2xl rounded-sm border border-[var(--border)] pointer-events-none select-none"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />

                    {/* On-screen Watermark Overlay (Omitted when printing) */}
                    <div
                      className="watermark-overlay print:hidden absolute inset-0 pointer-events-none select-none overflow-hidden"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                          `<svg width='400' height='240' xmlns='http://www.w3.org/2000/svg'><text x='20' y='80' transform='rotate(-25 200 120)' font-family='sans-serif' font-size='14' font-weight='900' fill='rgba(220,38,38,0.28)' letter-spacing='1.5'>PRINTSAFE PRIVATE VIEW • DO NOT PHOTOGRAPH</text><text x='35' y='145' transform='rotate(-25 200 120)' font-family='monospace' font-size='12' font-weight='800' fill='rgba(15,23,42,0.26)' letter-spacing='1'>JOB #${jobId.slice(0, 8).toUpperCase()} • CONFIDENTIAL COUNTER VIEW</text></svg>`
                        )}")`,
                        backgroundRepeat: "repeat",
                      }}
                    >
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                        <span className="px-3 py-1 rounded-full bg-red-950/80 text-[10px] font-mono font-bold text-red-200 border border-red-500/40 backdrop-blur-sm">
                          Private Preview &bull; Watermark overlay is omitted
                          when printing
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Print-Only Container (Rendered ONLY during window.print) */}
        <div
          id="print-container"
          className="hidden print:block text-black bg-white"
          style={{
            filter:
              session?.settings.color === false ? "grayscale(100%)" : "none",
          }}
        >
          {session?.requestedPages.map((pageNo) => (
            <div
              key={`print-page-${pageNo}`}
              className="page-break"
              style={{
                pageBreakAfter: "always",
                breakAfter: "page",
                width: "100%",
                margin: "0",
                padding: "0",
                backgroundColor: "#ffffff",
              }}
            >
              {/* Image loaded directly for print output */}
              {pageBlobs[pageNo] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pageBlobs[pageNo]}
                  alt={`Page ${pageNo}`}
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                    margin: "0 auto",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Mark Printed Confirmation Modal */}
      <Modal
        isOpen={showMarkPrintedConfirm}
        onClose={() => setShowMarkPrintedConfirm(false)}
        title="Confirm Print Completion"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--text)]">
            Are you sure all pages have been printed successfully on your
            physical printer?
          </p>

          <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
            <span className="font-extrabold text-[var(--text)] block">
              What happens next:
            </span>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
              <li>Viewer window is closed immediately.</li>
              {session?.deleteAfterPrint && (
                <li className="text-[var(--danger)] font-bold">
                  Document has &quot;Delete after printing&quot; enabled &mdash;
                  original file and page caches will be wiped immediately from
                  vault storage.
                </li>
              )}
              <li>Job status updates to &quot;Printed&quot;.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button3D
              variant="secondary"
              size="sm"
              onClick={() => setShowMarkPrintedConfirm(false)}
              disabled={isMarkingPrinted}
            >
              Cancel
            </Button3D>
            <Button3D
              variant="primary"
              size="sm"
              onClick={handleMarkPrintedConfirm}
              disabled={isMarkingPrinted}
            >
              <span className="text-zinc-950 font-black">
                {isMarkingPrinted ? "Processing..." : "Confirm & Mark Printed"}
              </span>
            </Button3D>
          </div>
        </div>
      </Modal>

      {/* Global Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${session?.settings.paper_size || "A4"};
            margin: 0;
          }
          html,
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          header,
          footer,
          nav,
          aside,
          button,
          .watermark-overlay,
          .print\\:hidden,
          [role="dialog"] {
            display: none !important;
          }
          #print-container {
            display: block !important;
            position: static !important;
            visibility: visible !important;
          }
          #print-container img {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            height: auto !important;
          }
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
}
