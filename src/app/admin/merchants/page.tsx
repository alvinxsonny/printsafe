"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card3D, Badge, Button3D } from "@/components/ui";

interface ShopSummary {
  id: string;
  name: string;
  status:
    | "draft"
    | "pending_review"
    | "changes_requested"
    | "approved"
    | "rejected"
    | "suspended";
  addressLine: string;
  locality: string | null;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string | null;
  priceBwPaise: number;
  priceColorPaise: number;
  createdAt: string;
}

const STATUS_FILTERS = [
  { id: "all", label: "All Shops" },
  { id: "pending_review", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "changes_requested", label: "Changes Requested" },
  { id: "suspended", label: "Suspended" },
  { id: "rejected", label: "Rejected" },
];

const ITEMS_PER_PAGE = 10;

export default function AdminMerchantsPage() {
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;
    fetch(
      `/api/admin/merchants?status=${selectedStatus}&q=${encodeURIComponent(searchQuery)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setShops(data.shops || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Could not load merchants:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedStatus, searchQuery]);

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(shops.length / ITEMS_PER_PAGE));
  const paginatedShops = shops.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  function getStatusBadge(status: ShopSummary["status"]) {
    switch (status) {
      case "approved":
        return <Badge variant="approved">Approved</Badge>;
      case "pending_review":
        return <Badge variant="pending">Pending Review</Badge>;
      case "changes_requested":
        return <Badge variant="pending">Changes Requested</Badge>;
      case "suspended":
        return <Badge variant="rejected">Suspended</Badge>;
      case "rejected":
        return <Badge variant="rejected">Rejected</Badge>;
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                Merchant Verification Queue
              </h1>
              <Badge variant="neutral" size="sm">
                {shops.length} Storefronts
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Review Google Maps links, storefront signage, and activate
              commercial subscriptions.
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {STATUS_FILTERS.map((f) => {
              const active = selectedStatus === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedStatus(f.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 border select-none ${
                    active
                      ? "bg-[var(--surface-2)] text-[var(--text)] border-[var(--accent)] ring-1 ring-[var(--accent)]"
                      : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search name or city..."
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

        {/* Merchant Table Card */}
        <Card3D className="overflow-hidden border border-[var(--border)]">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              <span className="text-xs text-[var(--text-muted)]">
                Loading merchants...
              </span>
            </div>
          ) : paginatedShops.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Store className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
              <h3 className="text-sm font-bold text-[var(--text)]">
                No Merchants Found
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                No shop matches the selected filter or search query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-2)] text-[var(--text-muted)] font-bold uppercase tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="px-5 py-3.5">Storefront Name</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Rates (B&W / Col)</th>
                    <th className="px-5 py-3.5">Submitted</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginatedShops.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-[var(--surface-2)]/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-[var(--text)] text-sm">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono">
                          ID: {s.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-[var(--text)]">
                          {s.city}, {s.state}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs">
                          {s.addressLine}
                        </div>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(s.status)}</td>
                      <td className="px-5 py-4 font-mono">
                        ₹{(s.priceBwPaise / 100).toFixed(2)} / ₹
                        {(s.priceColorPaise / 100).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-[var(--text-muted)]">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/admin/merchants/${s.id}`}>
                          <Button3D
                            variant={
                              s.status === "pending_review"
                                ? "primary"
                                : "secondary"
                            }
                            size="sm"
                            className="inline-flex items-center gap-1"
                          >
                            Review
                            <ArrowRight className="w-3 h-3" />
                          </Button3D>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
              <span className="text-xs text-[var(--text-muted)]">
                Page {currentPage} of {totalPages} ({shops.length} total)
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
