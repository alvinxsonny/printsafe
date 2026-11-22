import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { auth } from "@/lib/auth";
import { getDevOtp } from "@/lib/auth/devOtp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, entrance } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. IP and Email rate limiting (Section 10 & Phase 4 Task 8)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const ipLimit = await checkRateLimit(`otp:ip:${ip}`, 10, 600);
    if (!ipLimit.success) {
      return NextResponse.json(
        {
          error:
            "Too many attempts from this network. Please wait a few minutes.",
        },
        { status: 429 }
      );
    }

    const emailLimit = await checkRateLimit(`otp:email:${cleanEmail}`, 3, 600);
    if (!emailLimit.success) {
      return NextResponse.json(
        {
          error:
            "Too many passcode requests for this email. Please check your inbox or wait 10 minutes.",
        },
        { status: 429 }
      );
    }

    // 2. Fetch existing user and role if present
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    // 3. Entrance and role validation (Phase 4 Tasks 2 & 3)
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (entrance === "admin_login") {
      if (!adminEmails.includes(cleanEmail)) {
        return NextResponse.json(
          {
            error:
              "Access Denied: This email address is not registered for admin access.",
          },
          { status: 403 }
        );
      }
    } else if (entrance === "customer_signup") {
      if (existingUser) {
        if (existingUser.role === "merchant") {
          return NextResponse.json(
            {
              error:
                "This email is registered as a merchant. Please log in at /merchant/login.",
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          {
            error:
              "An account already exists with this email. Please log in at /login.",
          },
          { status: 400 }
        );
      }
    } else if (entrance === "customer_login") {
      if (!existingUser) {
        return NextResponse.json(
          {
            error:
              "No customer account found with this email. Please sign up first.",
          },
          { status: 404 }
        );
      }
      if (existingUser.role === "merchant") {
        return NextResponse.json(
          {
            error:
              "This email is registered as a merchant. Please log in at /merchant/login.",
          },
          { status: 400 }
        );
      }
    } else if (entrance === "merchant_signup") {
      if (existingUser) {
        if (existingUser.role === "customer") {
          return NextResponse.json(
            {
              error:
                "This email is already registered as a customer. Please use a separate shop email or log in at /login.",
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          {
            error:
              "A merchant account already exists with this email. Please log in at /merchant/login.",
          },
          { status: 400 }
        );
      }
    } else if (entrance === "merchant_login") {
      if (!existingUser) {
        return NextResponse.json(
          {
            error:
              "No merchant account found. Please register your shop first at /merchant/signup.",
          },
          { status: 404 }
        );
      }
      if (existingUser.role === "customer") {
        return NextResponse.json(
          {
            error:
              "This email is registered as a customer. Please log in at /login.",
          },
          { status: 400 }
        );
      }
    }

    // 4. Send Verification OTP via Better Auth
    await auth.api.sendVerificationOTP({
      body: {
        email: cleanEmail,
        type: "sign-in",
      },
    });

    const devOtp = getDevOtp(cleanEmail);
    const isLocalOrRestricted =
      process.env.NODE_ENV !== "production" ||
      cleanEmail !== "alvinxsonny@gmail.com";

    const message =
      isLocalOrRestricted && devOtp
        ? `Passcode generated: ${devOtp} (Development / Sandbox mode)`
        : `Passcode sent to ${cleanEmail}. Please check your inbox.`;

    return NextResponse.json({
      success: true,
      message,
      devOtp: isLocalOrRestricted ? devOtp : undefined,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: "Failed to send passcode. Please try again." },
      { status: 500 }
    );
  }
}
