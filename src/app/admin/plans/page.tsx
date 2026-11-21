import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";
import { AdminShell } from "@/components/layout/AdminShell";
import { PlansManager } from "./PlansManager";
import { Badge } from "@/components/ui";

export const instant = false;

export default async function AdminPlansPage() {
  await requireAdmin();

  const allPlans = await db.select().from(plans);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                Subscription & Vault Plans
              </h1>
              <Badge variant="live" size="sm">
                Reference Data
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Manage commercial merchant tiers and customer vault limits.
              Changes affect new subscriptions.
            </p>
          </div>
        </div>

        {/* Manager Component */}
        <PlansManager initialPlans={allPlans} />
      </div>
    </AdminShell>
  );
}
