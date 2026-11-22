import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops } from "@/lib/db/schema";
import { MerchantBillingClient } from "./MerchantBillingClient";

export const instant = false;

export default async function MerchantBillingPage() {
  const { user } = await requireMerchant();

  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.ownerId, user.id))
    .limit(1);

  if (!shop) {
    redirect("/merchant/onboarding");
  }

  if (shop.status === "draft") {
    redirect("/merchant/onboarding");
  }

  if (shop.status !== "approved") {
    redirect("/merchant/pending");
  }

  return <MerchantBillingClient />;
}
