import { AdminShell } from "@/components/layout/AdminShell";
import { Card3D, Badge } from "@/components/ui";

export default function AdminOverview() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Admin Overview
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Platform status, merchant verifications, and audit controls.
            </p>
          </div>
          <Badge variant="live">System Normal</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card3D className="p-5">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">
              Pending Reviews
            </span>
            <div className="text-2xl font-extrabold mt-2 tabular-nums">0</div>
          </Card3D>
          <Card3D className="p-5">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">
              Approved Shops
            </span>
            <div className="text-2xl font-extrabold mt-2 tabular-nums">0</div>
          </Card3D>
          <Card3D className="p-5">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">
              Jobs Today
            </span>
            <div className="text-2xl font-extrabold mt-2 tabular-nums">0</div>
          </Card3D>
        </div>
      </div>
    </AdminShell>
  );
}
