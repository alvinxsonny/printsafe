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
  Lock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button3D, Badge, Modal } from "@/components/ui";

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

  // Tab privacy shield state
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  // Printing state
  const [isPrinting, setIsPrinting] = useState(false);
  const [isMarkingPrinted, setIsMarkingPrinted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>("unlocked");
  const [showMarkPrintedConfirm, setShowMarkPrintedConfirm] = useState(false);

  // Loaded page image URLs for canvas & print rendering
  const [pageBlobs, setPageBlobs] = useState<Record<number, string>>({});
  const [loadingPages, setLoadingPages] = useState<Record<number, boolean>>({});

  // Canvas refs
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

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

  // 3. Security Deterrents: Blur / Focus listener
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        setIsWindowBlurred(true);
      } else {
        setIsWindowBlurred(false);
      }
    }

    function handleWindowBlur() {
      setIsWindowBlurred(true);
    }

    function handleWindowFocus() {
      setIsWindowBlurred(false);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  // 4. Security Deterrents: Keyboard shortcuts & right-click
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

  // 5. Load Pages into HTML5 Canvases
  useEffect(() => {
    if (!session?.requestedPages) return;

    let ignore = false;

    async function loadPages() {
      for (const p of session!.requestedPages) {
        if (pageBlobs[p] || loadingPages[p]) continue;

        setLoadingPages((prev) => ({ ...prev, [p]: true }));

        try {
          const res = await fetch(`/api/viewer/${jobId}/page/${p}`);
          if (!res.ok) {
            throw new Error(`Failed to load page ${p}`);
          }

          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);

          if (!ignore) {
            setPageBlobs((prev) => ({ ...prev, [p]: objectUrl }));

            // Draw to canvas
            const img = new Image();
            img.onload = () => {
              const canvas = canvasRefs.current[p];
              if (canvas) {
                canvas.width = img.naturalWidth || 1200;
                canvas.height = img.naturalHeight || 1600;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                }
              }
            };
            img.src = objectUrl;
          }
        } catch (err) {
          console.warn(`Failed loading page ${p}:`, err);
        } finally {
          if (!ignore) {
            setLoadingPages((prev) => ({ ...prev, [p]: false }));
          }
        }
      }
    }

    void loadPages();

    return () => {
      ignore = true;
    };
  }, [session, jobId, pageBlobs, loadingPages]);

  // Handle Print Action
  function handleTriggerPrint() {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
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
      <div className="min-h-screen bg-[#111827] text-white flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
        <p className="text-xs text-gray-400 font-semibold">
          Verifying security authorization &amp; decrypting pages...
        </p>
      </div>
    );
  }

  if (errorMessage && !session) {
    return (
      <div className="min-h-screen bg-[#111827] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black tracking-tight">Access Prohibited</h2>
        <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
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
      className="min-h-screen bg-[#0F172A] text-gray-100 flex flex-col select-none relative"
    >
      {/* Privacy Shield Overlay when window loses focus */}
      {isWindowBlurred && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-3 cursor-pointer">
          <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black tracking-tight text-white">
            Document Hidden For Privacy
          </h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Content is automatically shielded while this window or tab is not
            active. Click anywhere on this screen to resume viewing.
          </p>
        </div>
      )}

      {/* Access Expired Screen */}
      {isExpired && (
        <div className="fixed inset-0 z-40 bg-[#0F172A] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black tracking-tight text-white">
            Viewing Window Expired
          </h3>
          <p className="text-xs text-gray-400 max-w-md">
            The 30-minute zero-trust viewing window has ended. To inspect or
            print again, the customer must provide a regenerated code.
          </p>
          <Link href={`/merchant/jobs/${jobId}`}>
            <Button3D variant="secondary" size="sm">
              Return to Job Dashboard
            </Button3D>
          </Link>
        </div>
      )}

      {/* Top Fixed Control Bar (Screen Only - Hidden in Print) */}
      <header className="print:hidden sticky top-0 z-30 bg-[#1E293B]/95 backdrop-blur-md border-b border-gray-700/60 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href={`/merchant/jobs/${jobId}`}
            className="p-1.5 rounded-xl border border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
            title="Exit viewer"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white">
                {session?.customerAlias}
              </h1>
              <Badge variant="live" size="sm">
                READER UNLOCKED
              </Badge>
              {session?.deleteAfterPrint && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-bold text-rose-300">
                  AUTO-DELETE ON PRINT
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              Job #{jobId.slice(0, 8)} &bull; {session?.requestedPages.length}{" "}
              pages &bull; Reopen #{session?.openCount}
            </p>
          </div>
        </div>

        {/* Live Countdown & Action Buttons */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-gray-800 border border-gray-700 flex items-center gap-2 text-xs font-mono">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span
              className={`font-black ${
                secondsLeft <= 120
                  ? "text-amber-400 animate-pulse"
                  : "text-emerald-400"
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
                className="flex items-center gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>{isPrinting ? "Opening..." : "Print Document"}</span>
              </Button3D>

              <Button3D
                variant="secondary"
                size="sm"
                onClick={() => setShowMarkPrintedConfirm(true)}
                disabled={isMarkingPrinted}
                className="flex items-center gap-1.5 text-xs text-gray-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
              className="flex items-center gap-1.5 font-bold bg-emerald-600 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCompleting ? "Completing..." : "Mark Completed"}</span>
            </Button3D>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Print Instructions Card (Screen Only) */}
        <div className="print:hidden p-5 rounded-2xl bg-gradient-to-r from-gray-800 to-gray-800/80 border border-gray-700/80 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Printer Hardware Settings Checklist
              </h2>
            </div>
            <span className="text-[11px] text-gray-400 font-mono">
              Rate Quote: ₹{((session?.quotePaise || 0) / 100).toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-700/50">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Copies
              </span>
              <span className="text-sm font-black font-mono text-white">
                {session?.settings.copies || 1}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-700/50">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Color Mode
              </span>
              <span className="text-sm font-black text-white">
                {session?.settings.color ? "Colour" : "Black & White"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-700/50">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Paper Sides
              </span>
              <span className="text-sm font-black text-white">
                {session?.settings.duplex ? "2-Sided (Duplex)" : "1-Sided"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-700/50">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Paper Size
              </span>
              <span className="text-sm font-black text-white">
                {session?.settings.paper_size || "A4"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>
              Browsers cannot preset your printer hardware dialog. Please ensure
              your physical printer settings match the checklist above before
              printing.
            </p>
          </div>
        </div>

        {/* Security Confidentiality Notice (Screen Only) */}
        <div className="print:hidden flex items-center justify-center gap-2 text-center text-xs text-gray-400 py-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            This document is private. Page viewing is logged in real-time. Do
            not photograph or copy.
          </span>
        </div>

        {/* Canvases View (Screen Display) */}
        <div className="print:hidden space-y-6">
          {session?.requestedPages.map((pageNo) => {
            const isPageLoading = loadingPages[pageNo] && !pageBlobs[pageNo];

            return (
              <div
                key={pageNo}
                className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-700/60 mx-auto max-w-2xl relative"
              >
                <div className="bg-gray-100 border-b border-gray-200 px-4 py-1.5 flex items-center justify-between text-[11px] text-gray-600 font-mono">
                  <span>Page {pageNo}</span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">
                    Watermarked Zero-Trust View
                  </span>
                </div>

                {isPageLoading && (
                  <div className="h-96 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Decrypting page {pageNo}...</span>
                  </div>
                )}

                <div className="flex justify-center p-2 bg-gray-50 overflow-hidden">
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[pageNo] = el;
                    }}
                    className="max-w-full h-auto shadow-inner rounded-sm"
                  />
                </div>
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
              {isMarkingPrinted ? "Processing..." : "Confirm & Mark Printed"}
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
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header,
          footer,
          nav,
          aside,
          button,
          .print\\:hidden {
            display: none !important;
          }
          #print-container {
            display: block !important;
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
