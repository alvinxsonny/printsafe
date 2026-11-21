import Link from "next/link";
import { sql, gte } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, printJobs } from "@/lib/db/schema";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card3D, Badge, Button3D } from "@/components/ui";
import {
  Store,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const instant = false;

export default async function AdminOverview() {
  await requireAdmin();

  // 1. Fetch shop counts
  const allShops = await db
    .select({
      id: shops.id,
      name: shops.name,
      status: shops.status,
      city: shops.city,
      createdAt: shops.createdAt,
    })
    .from(shops);

  let pendingCount = 0;
  let approvedCount = 0;
  let suspendedCount = 0;
  const pendingShops: typeof allShops = [];

  for (const s of allShops) {
    if (s.status === "pending_review") {
      pendingCount++;
      pendingShops.push(s);
    } else if (s.status === "approved") {
      approvedCount++;
    } else if (s.status === "suspended") {
      suspendedCount++;
    }
  }

  // 2. Fetch jobs today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const jobsTodayRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(printJobs)
    .where(gte(printJobs.requestedAt, startOfToday));

  const jobsToday = Number(jobsTodayRows[0]?.count || 0);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                Admin Control Room
              </h1>
              <Badge variant="live" size="sm">
                Live PostGIS
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Zero-PII verification console, merchant approvals, and system
              controls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/merchants">
              <Button3D
                variant="primary"
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Store className="w-4 h-4" />
                Review Merchants ({pendingCount})
              </Button3D>
            </Link>
          </div>
        </div>

        {/* High-level Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card3D className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm)]">
                Pending Verification
              </span>
              <Clock className="w-4 h-4 text-[var(--warm)]" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold tabular-nums text-[var(--text)]">
                {pendingCount}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Storefronts waiting for review
              </p>
            </div>
          </Card3D>

          <Card3D className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                Approved Shops
              </span>
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold tabular-nums text-[var(--text)]">
                {approvedCount}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Active on the network
              </p>
            </div>
          </Card3D>

          <Card3D className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--danger)]">
                Suspended Shops
              </span>
              <AlertTriangle className="w-4 h-4 text-[var(--danger)]" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold tabular-nums text-[var(--text)]">
                {suspendedCount}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Forced offline by admin
              </p>
            </div>
          </Card3D>

          <Card3D className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--info)]">
                Print Jobs Today
              </span>
              <FileText className="w-4 h-4 text-[var(--info)]" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold tabular-nums text-[var(--text)]">
                {jobsToday}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Dispatched across shops
              </p>
            </div>
          </Card3D>
        </div>

        {/* Pending Review Action Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold tracking-tight">
              Awaiting Verification ({pendingShops.length})
            </h2>
            <Link
              href="/admin/merchants"
              className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              View Full Queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingShops.length === 0 ? (
            <Card3D className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[var(--accent)] mx-auto" />
              <h3 className="text-sm font-bold text-[var(--text)]">
                Queue is Clear
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                All submitted merchant storefronts have been reviewed. New
                applications will appear here automatically.
              </p>
            </Card3D>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingShops.slice(0, 4).map((s) => (
                <Card3D
                  key={s.id}
                  className="p-5 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[var(--text)]">
                        {s.name}
                      </h4>
                      <Badge variant="pending" size="sm">
                        Pending
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {s.city} &bull; Submitted{" "}
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/admin/merchants/${s.id}`}>
                    <Button3D variant="primary" size="sm" className="shrink-0">
                      Review
                    </Button3D>
                  </Link>
                </Card3D>
              ))}
            </div>
          )}
        </div>

        {/* Privacy & Zero-Trust Notice */}
        <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-[var(--text)]">
              Zero-Trust Admin Privacy Guarantee:
            </strong>{" "}
            PrintSafe cryptographically shields customer documents.
            Administrators have zero access to filenames, raw files, or customer
            contact information. Job views surface only anonymized status, sheet
            counts, and transaction amounts.
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
