import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { payments, shops, printJobs, plans } from "@/lib/db/schema";
import { paymentProvider } from "@/lib/payments/razorpay";
import { env } from "@/lib/env";
import { PLANS } from "@/config/plans";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { kind, refId } = body;

    if (!kind || !refId) {
      return NextResponse.json(
        { error: "kind and refId are required." },
        { status: 400 }
      );
    }

    if (
      kind !== "merchant_plan" &&
      kind !== "customer_plan" &&
      kind !== "job"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment kind. Must be merchant_plan, customer_plan, or job.",
        },
        { status: 400 }
      );
    }

    // 1. Merchant Plan
    if (kind === "merchant_plan") {
      if (session.user.role !== "merchant" && session.user.role !== "admin") {
        return NextResponse.json(
          { error: "Merchant role required to purchase merchant plans." },
          { status: 403 }
        );
      }

      const [shop] = await db
        .select()
        .from(shops)
        .where(eq(shops.ownerId, session.user.id))
        .limit(1);

      if (!shop) {
        return NextResponse.json(
          { error: "No print shop found for this account." },
          { status: 404 }
        );
      }

      // Find plan in DB or static fallback
      const [dbPlan] = await db
        .select()
        .from(plans)
        .where(and(eq(plans.id, refId), eq(plans.audience, "merchant")))
        .limit(1);

      const planDef =
        dbPlan ||
        PLANS.find((p) => p.id === refId && p.audience === "merchant");

      if (!planDef || planDef.pricePaise <= 0) {
        return NextResponse.json(
          { error: "Invalid merchant subscription plan selected." },
          { status: 400 }
        );
      }

      const receipt = `rcpt_mp_${Date.now().toString().slice(-8)}`;
      const order = await paymentProvider.createOrder({
        amountPaise: planDef.pricePaise,
        currency: "INR",
        receipt,
        notes: {
          kind: "merchant_plan",
          planId: planDef.id,
          shopId: shop.id,
          userId: session.user.id,
        },
      });

      const paymentId = `pay_${crypto.randomUUID()}`;
      await db.insert(payments).values({
        id: paymentId,
        kind: "merchant_plan",
        refId: planDef.id,
        payerUserId: session.user.id,
        amountPaise: planDef.pricePaise,
        status: "created",
        razorpayOrderId: order.id,
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amountPaise: planDef.pricePaise,
        currency: "INR",
        keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        paymentMode: env.PAYMENT_MODE,
        planName: planDef.name,
        paymentRecordId: paymentId,
      });
    }

    // 2. Customer Plan
    if (kind === "customer_plan") {
      const [dbPlan] = await db
        .select()
        .from(plans)
        .where(and(eq(plans.id, refId), eq(plans.audience, "customer")))
        .limit(1);

      const planDef =
        dbPlan ||
        PLANS.find((p) => p.id === refId && p.audience === "customer");

      if (!planDef || planDef.pricePaise <= 0) {
        return NextResponse.json(
          { error: "Invalid customer subscription plan selected." },
          { status: 400 }
        );
      }

      const receipt = `rcpt_cp_${Date.now().toString().slice(-8)}`;
      const order = await paymentProvider.createOrder({
        amountPaise: planDef.pricePaise,
        currency: "INR",
        receipt,
        notes: {
          kind: "customer_plan",
          planId: planDef.id,
          userId: session.user.id,
        },
      });

      const paymentId = `pay_${crypto.randomUUID()}`;
      await db.insert(payments).values({
        id: paymentId,
        kind: "customer_plan",
        refId: planDef.id,
        payerUserId: session.user.id,
        amountPaise: planDef.pricePaise,
        status: "created",
        razorpayOrderId: order.id,
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amountPaise: planDef.pricePaise,
        currency: "INR",
        keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        paymentMode: env.PAYMENT_MODE,
        planName: planDef.name,
        paymentRecordId: paymentId,
      });
    }

    // 3. Print Job (Far Mode)
    if (kind === "job") {
      const [job] = await db
        .select()
        .from(printJobs)
        .where(
          and(
            eq(printJobs.id, refId),
            eq(printJobs.customerId, session.user.id)
          )
        )
        .limit(1);

      if (!job) {
        return NextResponse.json(
          { error: "Print job request not found." },
          { status: 404 }
        );
      }

      if (job.mode !== "far") {
        return NextResponse.json(
          { error: "Online pre-payment is only required for 'far' mode jobs." },
          { status: 400 }
        );
      }

      if (job.status !== "awaiting_payment") {
        return NextResponse.json(
          {
            error: `Cannot initiate payment for job in '${job.status}' status (must be 'awaiting_payment').`,
          },
          { status: 400 }
        );
      }

      const receipt = `rcpt_job_${job.id.slice(-8)}`;
      const order = await paymentProvider.createOrder({
        amountPaise: job.quotePaise,
        currency: "INR",
        receipt,
        notes: {
          kind: "job",
          jobId: job.id,
          customerId: session.user.id,
          shopId: job.shopId,
        },
      });

      const paymentId = `pay_${crypto.randomUUID()}`;
      await db.insert(payments).values({
        id: paymentId,
        kind: "job",
        refId: job.id,
        payerUserId: session.user.id,
        amountPaise: job.quotePaise,
        status: "created",
        razorpayOrderId: order.id,
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amountPaise: job.quotePaise,
        currency: "INR",
        keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        paymentMode: env.PAYMENT_MODE,
        jobId: job.id,
        paymentRecordId: paymentId,
      });
    }

    return NextResponse.json(
      { error: "Unsupported request." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to create payment order";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
