import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops } from "@/lib/db/schema";
import { MerchantShell } from "@/components/layout/MerchantShell";
import { Card3D, Badge } from "@/components/ui";

export const instant = false;

export default async function MerchantDashboard() {
  const { user } = await requireMerchant();

  // Find shop for this merchant
  const merchantShops = await db
    .select()
    .from(shops)
    .where(eq(shops.ownerId, user.id))
    .limit(1);

  if (merchantShops.length === 0) {
    redirect("/merchant/onboarding");
  }

  const shop = merchantShops[0];

  if (shop.status === "draft") {
    redirect("/merchant/onboarding");
  }

  if (
    shop.status === "pending_review" ||
    shop.status === "changes_requested" ||
    shop.status === "rejected"
  ) {
    redirect("/merchant/pending");
  }

  // Approved shop
  return (
    <MerchantShell shopName={shop.name} isLiveInitial={shop.manualLive}>
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {shop.name}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {shop.addressLine}, {shop.city}
            </p>
          </div>
          <Badge variant="approved">Approved &bull; 30-Day Growth Trial</Badge>
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
