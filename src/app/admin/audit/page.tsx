"use client";

import React, { useState, useEffect } from "react";
import {
  ScrollText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card3D, Badge, Button3D } from "@/components/ui";

interface AuditLogRow {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_OPTIONS = [
  { id: "all", label: "All Actions" },
  { id: "shop.approved", label: "shop.approved" },
  { id: "shop.changes_requested", label: "shop.changes_requested" },
  { id: "shop.rejected", label: "shop.rejected" },
  { id: "shop.suspended", label: "shop.suspended" },
  { id: "shop.reinstated", label: "shop.reinstated" },
  { id: "shop.submitted", label: "shop.submitted" },
  { id: "plan.updated", label: "plan.updated" },
];

const ITEMS_PER_PAGE = 15;

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;
    fetch(
      `/api/admin/audit?action=${selectedAction}&q=${encodeURIComponent(
        searchQuery
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setLogs(data.logs || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Could not load audit log:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAction, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(logs.length / ITEMS_PER_PAGE));
  const paginatedLogs = logs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                System Audit Log
              </h1>
              <Badge variant="live" size="sm">
                Immutable Ledger
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Comprehensive record of administrator actions, merchant
              transitions, and plan modifications.
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-medium"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search action, actor, entity ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 pl-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-inner"
            />
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-3.5" />
          </div>
        </div>

        {/* Audit Log Table */}
        <Card3D className="overflow-hidden border border-[var(--border)]">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              <span className="text-xs text-[var(--text-muted)]">
                Loading audit trail...
              </span>
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ScrollText className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
              <h3 className="text-sm font-bold text-[var(--text)]">
                No Audit Entries Found
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                No log matches your search query or action filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-2)] text-[var(--text-muted)] font-bold uppercase tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5">Actor</th>
                    <th className="px-5 py-3.5">Action</th>
                    <th className="px-5 py-3.5">Entity</th>
                    <th className="px-5 py-3.5">Metadata Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-mono">
                  {paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-[var(--surface-2)]/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap text-[var(--text-muted)] text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[var(--text)]">
                          {log.actorRole.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {log.actorId.slice(0, 10)}...
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-bold text-[var(--text)]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-[var(--text)] font-semibold">
                          {log.entity}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {log.entityId.slice(0, 12)}...
                        </div>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs truncate text-[11px] text-[var(--text-muted)]">
                        {log.meta ? JSON.stringify(log.meta) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
              <span className="text-xs text-[var(--text-muted)]">
                Page {currentPage} of {totalPages} ({logs.length} entries)
              </span>
              <div className="flex items-center gap-2">
                <Button3D
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button3D>
                <Button3D
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button3D>
              </div>
            </div>
          )}
        </Card3D>
      </div>
    </AdminShell>
  );
}
