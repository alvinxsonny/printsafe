import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, customerProfiles } from "@/lib/db/schema";
import { generateUniqueAlias } from "@/lib/auth/alias";
import { auth } from "@/lib/auth";
import { CURRENT_POLICY_VERSION } from "@/config/app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, entrance, consent } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and passcode are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Customer sign-up requires privacy consent checkbox (Phase 4 Task 4)
    if (entrance === "customer_signup" && !consent) {
      return NextResponse.json(
        {
          error:
            "You must agree to the Privacy Policy to create a customer vault.",
        },
        { status: 400 }
      );
    }

    // 1. Verify OTP with Better Auth
    const verifyRes = await auth.api.signInEmailOTP({
      body: {
        email: cleanEmail,
        otp: otp.trim(),
      },
      asResponse: true,
    });

    if (!verifyRes.ok) {
      const errData = await verifyRes.json().catch(() => null);
      return NextResponse.json(
        {
          error:
            errData?.message ||
            "Invalid or expired passcode. Please try again.",
        },
        { status: 400 }
      );
    }

    // 2. Query user record to set role, alias, and profile
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "User verification error." },
        { status: 500 }
      );
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    let redirectUrl = "/app";

    // 3. Handle Role and Alias assignment
    if (entrance === "admin_login" || adminEmails.includes(cleanEmail)) {
      if (adminEmails.includes(cleanEmail)) {
        await db
          .update(users)
          .set({ role: "admin", updatedAt: new Date() })
          .where(eq(users.id, user.id));
        redirectUrl = "/admin";
      }
    } else if (
      entrance === "merchant_signup" ||
      entrance === "merchant_login"
    ) {
      if (user.role !== "merchant") {
        await db
          .update(users)
          .set({
            role: "merchant",
            alias: `Merchant ${user.id.slice(0, 4).toUpperCase()}`,
            consentAt: new Date(),
            policyVersion: CURRENT_POLICY_VERSION,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }
      redirectUrl =
        entrance === "merchant_signup" ? "/merchant/onboarding" : "/merchant";
    } else {
      // Customer
      if (entrance === "customer_signup" || user.alias === "Customer") {
        const uniqueAlias = await generateUniqueAlias();
        await db
          .update(users)
          .set({
            role: "customer",
            alias: uniqueAlias,
            consentAt: new Date(),
            policyVersion: CURRENT_POLICY_VERSION,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        // Create customer profile with default Free plan
        const [existingProfile] = await db
          .select({ id: customerProfiles.id })
          .from(customerProfiles)
          .where(eq(customerProfiles.userId, user.id))
          .limit(1);

        if (!existingProfile) {
          await db.insert(customerProfiles).values({
            id: `cp_${user.id}`,
            userId: user.id,
            planId: "customer_free",
            sheetsPrintedTotal: 0,
            notifyEnabled: false,
          });
        }
      }
      redirectUrl = "/app";
    }

    // Forward the session cookie set by Better Auth
    const setCookie = verifyRes.headers.get("set-cookie");
    const response = NextResponse.json({ success: true, redirectUrl });

    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Verification failed. Please check the code and try again." },
      { status: 500 }
    );
  }
}
