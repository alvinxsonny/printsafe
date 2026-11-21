import { MerchantShell } from "@/components/layout/MerchantShell";
import { Card3D, Badge } from "@/components/ui";

export default function MerchantDashboard() {
  return (
    <MerchantShell shopName="Print Center Hub" isLiveInitial={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Merchant Overview
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Manage incoming print requests and monitor daily print metrics.
            </p>
          </div>
          <Badge variant="pending">30-Day Growth Trial</Badge>
        </div>

        <Card3D className="p-6">
          <h3 className="text-sm font-bold uppercase text-[var(--text-muted)]">
            Active Print Queue
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            No pending print requests at the moment. Switch your shop to{" "}
            <strong>LIVE</strong> to start receiving customer jobs.
          </p>
        </Card3D>
      </div>
    </MerchantShell>
  );
}
