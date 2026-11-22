import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops } from "@/lib/db/schema";
import { MerchantJobDetailClient } from "./MerchantJobDetailClient";

export const instant = false;

export default async function MerchantJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireMerchant();
  const { id: jobId } = await params;

  if (
    process.env.ALLOW_TEST_AUTH === "true" &&
    user.id === "usr_test_merchant"
  ) {
    return <MerchantJobDetailClient jobId={jobId} />;
  }

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

  return <MerchantJobDetailClient jobId={jobId} />;
}
