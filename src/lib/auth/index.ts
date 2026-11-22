import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/lib/db/client";
import { users, sessions, accounts, verifications } from "@/lib/db/schema";
import { sendOtpEmail } from "@/lib/notify/email";

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "b3cac1a92c56f44464547934ee27acd157595f351ce1a5ef573cb7a62caff6ed",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "customer",
      },
      alias: {
        type: "string",
        required: true,
        defaultValue: "Customer",
      },
      consentAt: {
        type: "date",
        required: false,
      },
      policyVersion: {
        type: "string",
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      async sendVerificationOTP({ email, otp, type }) {
        const role = type === "sign-in" ? "Account" : "New User";
        await sendOtpEmail(email, otp, role);
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
