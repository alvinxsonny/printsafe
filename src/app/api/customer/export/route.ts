import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import {
  users,
  customerProfiles,
  documents,
  printJobs,
  payments,
  notifications,
  shops,
} from "@/lib/db/schema";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. User Account Record
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        alias: users.alias,
        role: users.role,
        consentAt: users.consentAt,
        policyVersion: users.policyVersion,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // 2. Customer Profile
    const [profile] = await db
      .select({
        planId: customerProfiles.planId,
        planPeriodEnd: customerProfiles.planPeriodEnd,
        sheetsPrintedTotal: customerProfiles.sheetsPrintedTotal,
        notifyEnabled: customerProfiles.notifyEnabled,
        notifyArea: customerProfiles.notifyArea,
      })
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, userId))
      .limit(1);

    // 3. Documents Metadata (Safe metadata only; no raw decryption keys)
    const docs = await db
      .select({
        id: documents.id,
        name: documents.displayName,
        mime: documents.mime,
        pageCount: documents.pageCount,
        sizeBytes: documents.sizeBytes,
        status: documents.status,
        deleteAfterPrint: documents.deleteAfterPrint,
        createdAt: documents.createdAt,
        expiresAt: documents.expiresAt,
      })
      .from(documents)
      .where(eq(documents.ownerId, userId));

    // 4. Print Jobs History
    const jobs = await db
      .select({
        id: printJobs.id,
        shopName: shops.name,
        mode: printJobs.mode,
        status: printJobs.status,
        sheets: printJobs.sheets,
        quotePaise: printJobs.quotePaise,
        requestedAt: printJobs.requestedAt,
        acceptedAt: printJobs.acceptedAt,
        paidAt: printJobs.paidAt,
        printedAt: printJobs.printedAt,
        completedAt: printJobs.completedAt,
      })
      .from(printJobs)
      .leftJoin(shops, eq(printJobs.shopId, shops.id))
      .where(eq(printJobs.customerId, userId));

    // 5. Payment Ledger
    const userPayments = await db
      .select({
        id: payments.id,
        kind: payments.kind,
        razorpayOrderId: payments.razorpayOrderId,
        amountPaise: payments.amountPaise,
        status: payments.status,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.payerUserId, userId));

    // 6. Notifications
    const userNotifs = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        payload: notifications.payload,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    const exportPayload = {
      exportMetadata: {
        platform: "PrintSafe Zero-Trust Printing",
        generatedAt: new Date().toISOString(),
        formatVersion: "1.0",
        purpose: "Data Subject Access Request (DPDP Act, 2023)",
      },
      user,
      customerProfile: profile ?? null,
      documents: docs,
      printJobs: jobs,
      payments: userPayments,
      notifications: userNotifs,
    };

    const filename = `printsafe-export-${userId.slice(-6)}-${Date.now()}.json`;

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store",
      },
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to export user data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
