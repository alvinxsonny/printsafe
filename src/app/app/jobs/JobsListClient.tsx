"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Printer,
  History,
  Clock,
  ChevronRight,
  Loader2,
  FileText,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Card3D, Button3D, Badge } from "@/components/ui";

interface JobSummary {
  id: string;
  shopId: string;
  shopName: string;
  shopLocality: string | null;
  shopCity: string;
  documentId: string;
  documentName: string;
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
  passcode?: string | null;
  requestedAt: string;
  completedAt?: string | null;
}

export function JobsListClient() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    let ignore = false;

    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs");
        if (!ignore && res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
        }
      } catch (err) {
        console.warn("Failed to load customer jobs:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void fetchJobs();

    // 10s auto-refresh
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchJobs();
      }
    }, 10000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  const filteredJobs = jobs.filter((j) => {
    if (filter === "active") {
      return [
        "requested",
        "accepted",
        "awaiting_payment",
        "paid",
        "unlocked",
        "printed",
      ].includes(j.status);
    }
    if (filter === "completed") {
      return ["completed", "rejected", "cancelled", "expired"].includes(
        j.status
      );
    }
    return true;
  });

  function getStatusBadge(status: JobSummary["status"]) {
    switch (status) {
      case "requested":
        return <Badge variant="pending">Waiting for Shop</Badge>;
      case "accepted":
        return <Badge variant="live">Accepted &bull; Code Ready</Badge>;
      case "awaiting_payment":
        return <Badge variant="info">Awaiting Payment</Badge>;
      case "paid":
        return <Badge variant="info">Paid &bull; In Queue</Badge>;
      case "unlocked":
        return <Badge variant="live">Printing in Progress</Badge>;
      case "printed":
        return <Badge variant="live">Printed &bull; Ready for Pickup</Badge>;
      case "completed":
        return <Badge variant="neutral">Completed</Badge>;
      case "rejected":
        return <Badge variant="rejected">Rejected by Shop</Badge>;
      case "cancelled":
        return <Badge variant="neutral">Cancelled</Badge>;
      case "expired":
        return <Badge variant="neutral">Expired</Badge>;
    }
  }

  return (
    <CustomerShell userAlias="Customer Orders">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              My Print Orders
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Track real-time acceptance, handover passcodes, and job status.
            </p>
          </div>

          <Link href="/app">
            <Button3D
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              New Print Request
            </Button3D>
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {(["all", "active", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all select-none ${
                filter === tab
                  ? "bg-[var(--accent)] text-white shadow-xs"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
              }`}
            >
              {tab === "all"
                ? `All Jobs (${jobs.length})`
                : tab === "active"
                  ? `Active (${
                      jobs.filter((j) =>
                        [
                          "requested",
                          "accepted",
                          "awaiting_payment",
                          "paid",
                          "unlocked",
                          "printed",
                        ].includes(j.status)
                      ).length
                    })`
                  : "Completed / History"}
            </button>
          ))}
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            <p className="text-xs text-[var(--text-muted)] font-semibold">
              Loading your print requests...
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card3D className="p-12 text-center space-y-3">
            <History className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-[var(--text)]">
              No print jobs found
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Find a nearby live print shop on the map to start your first
              secure one-time print request.
            </p>
            <div className="pt-2">
              <Link href="/app">
                <Button3D variant="primary" size="sm">
                  Find Live Shops
                </Button3D>
              </Link>
            </div>
          </Card3D>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <Link key={job.id} href={`/app/jobs/${job.id}`} className="block">
                <Card3D className="p-4 hover:border-[var(--accent)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[var(--border)]">
                  <div className="space-y-1.5 truncate">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-[var(--text)] truncate">
                        {job.shopName}
                      </h3>
                      {getStatusBadge(job.status)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] truncate">
                      <FileText className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      <span className="font-semibold text-[var(--text)] truncate">
                        {job.documentName}
                      </span>
                      <span>&bull;</span>
                      <span className="font-mono">{job.sheets} sheets</span>
                      <span>&bull;</span>
                      <span>
                        {job.mode === "near" ? "Walk-in" : "Pay online"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                      <Clock className="w-3 h-3" />
                      <span>
                        Requested{" "}
                        {new Date(job.requestedAt).toLocaleDateString()} at{" "}
                        {new Date(job.requestedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[var(--border)]">
                    {/* Handover Code Preview if active */}
                    {job.passcode && (
                      <div className="bg-[var(--accent-fill)]/15 border border-[#2EB673] px-3 py-1.5 rounded-xl text-center">
                        <span className="text-[9px] uppercase font-bold text-[#12724A] dark:text-[var(--accent)] block">
                          Passcode
                        </span>
                        <span className="text-sm font-black font-mono tracking-widest text-[var(--text)]">
                          {job.passcode}
                        </span>
                      </div>
                    )}

                    <div className="text-right">
                      <span className="text-[10px] text-[var(--text-muted)] block">
                        Total Amount
                      </span>
                      <span className="text-base font-black font-mono text-[var(--text)]">
                        ₹{(job.quotePaise / 100).toFixed(2)}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                </Card3D>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
