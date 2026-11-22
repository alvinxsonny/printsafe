import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops } from "@/lib/db/schema";
import { MerchantDashboardClient } from "./MerchantDashboardClient";

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

  // Approved shop -> render interactive dashboard
  return <MerchantDashboardClient />;
}
