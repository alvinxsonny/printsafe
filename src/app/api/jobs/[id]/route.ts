import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { printJobs, shops, documents, customerProfiles } from "@/lib/db/schema";
import { decryptPasscode } from "@/lib/jobs/passcode";
import { isJobExpired } from "@/lib/jobs/machine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await params;

    const [jobRow] = await db
      .select({
        id: printJobs.id,
        customerId: printJobs.customerId,
        shopId: printJobs.shopId,
        documentId: printJobs.documentId,
        mode: printJobs.mode,
        status: printJobs.status,
        settings: printJobs.settings,
        sheets: printJobs.sheets,
        quotePaise: printJobs.quotePaise,
        codeEnc: printJobs.codeEnc,
        codeExpiresAt: printJobs.codeExpiresAt,
        codeAttempts: printJobs.codeAttempts,
        unlockedUntil: printJobs.unlockedUntil,
        requestedAt: printJobs.requestedAt,
        acceptedAt: printJobs.acceptedAt,
        paidAt: printJobs.paidAt,
        printedAt: printJobs.printedAt,
        completedAt: printJobs.completedAt,
        expiresAt: printJobs.expiresAt,
        // Shop info
        shopName: shops.name,
        shopAddress: shops.addressLine,
        shopLocality: shops.locality,
        shopCity: shops.city,
        shopLatitude: shops.latitude,
        shopLongitude: shops.longitude,
        shopPhone: shops.contactPhone,
        shopShowPhone: shops.showPhone,
        shopOwnerId: shops.ownerId,
        // Document info
        documentName: documents.displayName,
        documentPageCount: documents.pageCount,
      })
      .from(printJobs)
      .innerJoin(shops, eq(printJobs.shopId, shops.id))
      .innerJoin(documents, eq(printJobs.documentId, documents.id))
      .where(eq(printJobs.id, jobId))
      .limit(1);

    if (!jobRow) {
      return NextResponse.json(
        { error: "Print job not found." },
        { status: 404 }
      );
    }

    // Role Guard: Customer can only view own job; Merchant can only view their shop's job; Admin can view all
    const isCustomerOwner = jobRow.customerId === session.user.id;
    const isShopOwner = jobRow.shopOwnerId === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isCustomerOwner && !isShopOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden. You do not have access to this job." },
        { status: 403 }
      );
    }

    let currentStatus = jobRow.status;
    if (currentStatus === "requested" && isJobExpired(jobRow)) {
      currentStatus = "expired";
      await db
        .update(printJobs)
        .set({ status: "expired" })
        .where(eq(printJobs.id, jobId));
    }

    // Handover Passcode visibility
    let passcode: string | null = null;
    let customerFootprint: { sheetsPrintedTotal: number } | null = null;
    if (isCustomerOwner) {
      if (
        jobRow.codeEnc &&
        (currentStatus === "accepted" || currentStatus === "unlocked")
      ) {
        try {
          passcode = decryptPasscode(jobRow.codeEnc);
        } catch {
          passcode = null;
        }
      }

      // Fetch customer paper footprint
      try {
        const [profile] = await db
          .select({ sheetsPrintedTotal: customerProfiles.sheetsPrintedTotal })
          .from(customerProfiles)
          .where(eq(customerProfiles.userId, session.user.id))
          .limit(1);
        customerFootprint = {
          sheetsPrintedTotal: profile?.sheetsPrintedTotal ?? 0,
        };
      } catch {
        customerFootprint = { sheetsPrintedTotal: 0 };
      }
    }

    return NextResponse.json(
      {
        job: {
          id: jobRow.id,
          mode: jobRow.mode,
          status: currentStatus,
          settings: jobRow.settings,
          sheets: jobRow.sheets,
          quotePaise: jobRow.quotePaise,
          passcode,
          codeExpiresAt: jobRow.codeExpiresAt,
          codeAttempts: jobRow.codeAttempts,
          unlockedUntil: jobRow.unlockedUntil,
          requestedAt: jobRow.requestedAt,
          acceptedAt: jobRow.acceptedAt,
          paidAt: jobRow.paidAt,
          printedAt: jobRow.printedAt,
          completedAt: jobRow.completedAt,
          expiresAt: jobRow.expiresAt,
          shop: {
            id: jobRow.shopId,
            name: jobRow.shopName,
            address: jobRow.shopAddress,
            locality: jobRow.shopLocality,
            city: jobRow.shopCity,
            latitude: jobRow.shopLatitude,
            longitude: jobRow.shopLongitude,
            phone: jobRow.shopShowPhone ? jobRow.shopPhone : null,
          },
          document: {
            id: jobRow.documentId,
            name: jobRow.documentName,
            pageCount: jobRow.documentPageCount,
          },
          customerFootprint,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch job details.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
