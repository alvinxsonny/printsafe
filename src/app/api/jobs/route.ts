import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import {
  printJobs,
  shops,
  shopHours,
  shopSubscriptions,
  plans,
  documents,
  auditLogs,
  notifications,
} from "@/lib/db/schema";
import { calculateJobQuote } from "@/lib/jobs/quote";
import { isShopLive } from "@/lib/db/queries";
import { decryptPasscode } from "@/lib/jobs/passcode";
import { isJobExpired } from "@/lib/jobs/machine";
import { REQUEST_EXPIRY_MINUTES } from "@/config/app";
import { canAcceptJob } from "@/lib/payments";
import { sendPushNotification } from "@/lib/notify";

/**
 * GET /api/jobs: Returns customer's print jobs history and active requests.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "customer" && session.user.role !== "admin")
    ) {
      return NextResponse.json(
        { error: "Unauthorized. Customer account required." },
        { status: 401 }
      );
    }

    const rows = await db
      .select({
        id: printJobs.id,
        shopId: printJobs.shopId,
        shopName: shops.name,
        shopLocality: shops.locality,
        shopCity: shops.city,
        documentId: printJobs.documentId,
        documentName: documents.displayName,
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
      })
      .from(printJobs)
      .innerJoin(shops, eq(printJobs.shopId, shops.id))
      .innerJoin(documents, eq(printJobs.documentId, documents.id))
      .where(eq(printJobs.customerId, session.user.id))
      .orderBy(desc(printJobs.requestedAt));

    const processedJobs = [];

    for (const job of rows) {
      let currentStatus = job.status;

      // Check on-read expiry for unanswered requested jobs
      if (currentStatus === "requested" && isJobExpired(job)) {
        currentStatus = "expired";
        await db
          .update(printJobs)
          .set({ status: "expired" })
          .where(eq(printJobs.id, job.id));
      }

      // Decrypt handover code for customer if accepted
      let passcode: string | null = null;
      if (
        job.codeEnc &&
        (currentStatus === "accepted" ||
          currentStatus === "paid" ||
          currentStatus === "unlocked")
      ) {
        try {
          passcode = decryptPasscode(job.codeEnc);
        } catch {
          passcode = null;
        }
      }

      processedJobs.push({
        ...job,
        status: currentStatus,
        passcode,
        codeEnc: undefined, // Never expose raw encrypted token to client
      });
    }

    return NextResponse.json(
      { jobs: processedJobs },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch print jobs.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/jobs: Creates a new print job request.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "customer" && session.user.role !== "admin")
    ) {
      return NextResponse.json(
        { error: "Unauthorized. Customer account required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { shopId, documentId, mode, settings } = body;

    if (!shopId || !documentId || !mode) {
      return NextResponse.json(
        {
          error: "shopId, documentId, and mode ('near' | 'far') are required.",
        },
        { status: 400 }
      );
    }

    if (mode !== "near" && mode !== "far") {
      return NextResponse.json(
        { error: "Mode must be either 'near' (Walk in) or 'far' (Pay now)." },
        { status: 400 }
      );
    }

    // 1. Verify Document
    const [doc] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.ownerId, session.user.id)
        )
      )
      .limit(1);

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found in your vault." },
        { status: 404 }
      );
    }

    if (doc.status !== "ready") {
      return NextResponse.json(
        {
          error: `Document is not ready for printing (status: ${doc.status}).`,
        },
        { status: 400 }
      );
    }

    // 2. Verify Shop & Subscription
    const shopRows = await db
      .select({
        shop: shops,
        subscription: shopSubscriptions,
        planLimits: plans.limits,
      })
      .from(shops)
      .innerJoin(shopSubscriptions, eq(shopSubscriptions.shopId, shops.id))
      .leftJoin(plans, eq(shopSubscriptions.planId, plans.id))
      .where(eq(shops.id, shopId))
      .limit(1);

    if (shopRows.length === 0) {
      return NextResponse.json(
        { error: "Print shop not found." },
        { status: 404 }
      );
    }

    const { shop, subscription } = shopRows[0];

    if (shop.status !== "approved") {
      return NextResponse.json(
        { error: "This print shop is currently not verified or eligible." },
        { status: 400 }
      );
    }

    // 3. Verify Shop Live Status
    const hours = await db
      .select()
      .from(shopHours)
      .where(eq(shopHours.shopId, shopId));

    const live = isShopLive(
      {
        status: shop.status,
        manualLive: shop.manualLive,
        scheduleEnabled: shop.scheduleEnabled,
      },
      hours,
      {
        status: subscription.status,
        periodEnd: subscription.periodEnd,
      }
    );

    if (!live) {
      return NextResponse.json(
        {
          error:
            "This print shop is currently closed or offline. Please choose another live shop.",
        },
        { status: 400 }
      );
    }

    // 4. Verify Shop Capacity & Plan Caps
    const limitCheck = await canAcceptJob(shopId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error:
            limitCheck.reason ||
            "This shop has reached its capacity and cannot accept new jobs.",
        },
        { status: 403 }
      );
    }

    const activeJobsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.shopId, shopId),
          inArray(printJobs.status, ["requested", "accepted", "unlocked"])
        )
      );

    if (Number(activeJobsCount[0]?.count || 0) >= 15) {
      return NextResponse.json(
        {
          error:
            "This shop's print queue is currently full. Please try again in a few minutes or choose another shop.",
        },
        { status: 429 }
      );
    }

    // 5. Server Recomputes Job Quote (Never trust client prices)
    const quoteResult = calculateJobQuote({
      pageRange: settings?.pages,
      totalDocumentPages: doc.pageCount || 1,
      copies: settings?.copies,
      duplex: settings?.duplex,
      color: settings?.color,
      priceBwPaise: shop.priceBwPaise,
      priceColorPaise: shop.priceColorPaise,
    });

    const now = new Date();
    const expiryTime = new Date(
      now.getTime() + REQUEST_EXPIRY_MINUTES * 60 * 1000
    );
    const jobId = `job_${crypto.randomUUID()}`;

    // 6. Insert Print Job
    await db.insert(printJobs).values({
      id: jobId,
      customerId: session.user.id,
      shopId: shop.id,
      documentId: doc.id,
      mode,
      status: "requested",
      settings: {
        pages: settings?.pages || "all",
        copies: settings?.copies || 1,
        color: Boolean(settings?.color),
        duplex:
          settings?.duplex !== undefined ? Boolean(settings?.duplex) : true,
        paper_size: settings?.paper_size || "A4",
        orientation: settings?.orientation || "portrait",
      },
      sheets: quoteResult.sheets,
      quotePaise: quoteResult.quotePaise,
      requestedAt: now,
      expiresAt: expiryTime,
    });

    // 7. Audit Log
    await db.insert(auditLogs).values({
      id: `audit_${crypto.randomUUID()}`,
      actorId: session.user.id,
      actorRole: "customer",
      action: "job_created",
      entity: "print_jobs",
      entityId: jobId,
      meta: {
        shopId: shop.id,
        mode,
        sheets: quoteResult.sheets,
        quotePaise: quoteResult.quotePaise,
      },
      createdAt: now,
    });

    // 8. Notification to Shop Owner
    await db.insert(notifications).values({
      id: `notif_${crypto.randomUUID()}`,
      userId: shop.ownerId,
      type: "new_print_request",
      payload: {
        jobId,
        sheets: quoteResult.sheets,
        quotePaise: quoteResult.quotePaise,
        mode,
        message: "New print request waiting in your queue.",
      },
      createdAt: now,
    });

    // 9. Send Web Push to Shop Owner
    void sendPushNotification(shop.ownerId, {
      title: "New Print Request!",
      body: `New order received for ${quoteResult.sheets} sheets.`,
      url: "/merchant/queue",
    });

    return NextResponse.json({
      success: true,
      jobId,
      quotePaise: quoteResult.quotePaise,
      sheets: quoteResult.sheets,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to create print job.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
