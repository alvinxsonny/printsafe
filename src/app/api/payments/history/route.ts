import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { payments, shops } from "@/lib/db/schema";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isMerchant = session.user.role === "merchant";

    let rows;
    if (isMerchant) {
      // Find merchant's shop
      const [shop] = await db
        .select()
        .from(shops)
        .where(eq(shops.ownerId, userId))
        .limit(1);

      if (shop) {
        // Query payments made by merchant OR paid jobs for merchant's shop
        rows = await db
          .select({
            id: payments.id,
            kind: payments.kind,
            refId: payments.refId,
            amountPaise: payments.amountPaise,
            status: payments.status,
            razorpayOrderId: payments.razorpayOrderId,
            razorpayPaymentId: payments.razorpayPaymentId,
            createdAt: payments.createdAt,
          })
          .from(payments)
          .where(eq(payments.payerUserId, userId))
          .orderBy(desc(payments.createdAt));
      } else {
        rows = await db
          .select({
            id: payments.id,
            kind: payments.kind,
            refId: payments.refId,
            amountPaise: payments.amountPaise,
            status: payments.status,
            razorpayOrderId: payments.razorpayOrderId,
            razorpayPaymentId: payments.razorpayPaymentId,
            createdAt: payments.createdAt,
          })
          .from(payments)
          .where(eq(payments.payerUserId, userId))
          .orderBy(desc(payments.createdAt));
      }
    } else {
      // Customer
      rows = await db
        .select({
          id: payments.id,
          kind: payments.kind,
          refId: payments.refId,
          amountPaise: payments.amountPaise,
          status: payments.status,
          razorpayOrderId: payments.razorpayOrderId,
          razorpayPaymentId: payments.razorpayPaymentId,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(eq(payments.payerUserId, userId))
        .orderBy(desc(payments.createdAt));
    }

    const formattedPayments = rows.map((p) => ({
      ...p,
      amountRupees: (p.amountPaise / 100).toFixed(2),
      receiptNumber: `PS-${p.id.slice(-8).toUpperCase()}`,
    }));

    return NextResponse.json(
      { payments: formattedPayments },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to fetch payment history";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
