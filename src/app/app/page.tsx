import { eq, and, gte } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { customerProfiles, printJobs } from "@/lib/db/schema";
import { CustomerHomeClient } from "./CustomerHomeClient";

export const instant = false;

export default async function CustomerHomePage() {
  const session = await getServerSession();
  const alias = session?.user.alias || "Customer";

  let sheetsPrintedTotal = 0;
  let hasNoPrintsLast30Days = false;

  if (session?.user.id) {
    try {
      const [profile] = await db
        .select({
          sheetsPrintedTotal: customerProfiles.sheetsPrintedTotal,
        })
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, session.user.id))
        .limit(1);

      sheetsPrintedTotal = profile?.sheetsPrintedTotal ?? 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentJobs = await db
        .select({ id: printJobs.id })
        .from(printJobs)
        .where(
          and(
            eq(printJobs.customerId, session.user.id),
            eq(printJobs.status, "completed"),
            gte(printJobs.completedAt, thirtyDaysAgo)
          )
        )
        .limit(1);

      hasNoPrintsLast30Days = recentJobs.length === 0;
    } catch {
      // Fallback to defaults
    }
  }

  return (
    <CustomerHomeClient
      userAlias={alias}
      initialSheetsPrintedTotal={sheetsPrintedTotal}
      initialHasNoPrintsLast30Days={hasNoPrintsLast30Days}
    />
  );
}
