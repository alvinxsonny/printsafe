import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { users, customerProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export const instant = false;

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const [user] = await db
    .select({
      id: users.id,
      alias: users.alias,
      email: users.email,
      role: users.role,
      consentAt: users.consentAt,
      policyVersion: users.policyVersion,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const [profile] = await db
    .select({
      planId: customerProfiles.planId,
      sheetsPrintedTotal: customerProfiles.sheetsPrintedTotal,
    })
    .from(customerProfiles)
    .where(eq(customerProfiles.userId, session.user.id))
    .limit(1);

  return (
    <SettingsClient
      user={{
        id: user?.id ?? session.user.id,
        alias: user?.alias ?? session.user.alias ?? "Customer",
        email: user?.email ?? session.user.email ?? "",
        role: user?.role ?? session.user.role ?? "customer",
        consentAt: user?.consentAt?.toISOString() ?? null,
        policyVersion: user?.policyVersion ?? "1.0",
        createdAt: user?.createdAt?.toISOString() ?? new Date().toISOString(),
      }}
      profile={{
        planId: profile?.planId ?? "customer_free",
        sheetsPrintedTotal: profile?.sheetsPrintedTotal ?? 0,
      }}
    />
  );
}
