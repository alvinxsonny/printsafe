import nodemailer from "nodemailer";
import { storeDevOtp } from "@/lib/auth/devOtp";

const smtpPort = Number(process.env.SMTP_PORT || "465");
const isSecure = smtpPort === 465;

export const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.com",
  port: smtpPort,
  secure: isSecure,
  auth: {
    user: process.env.SMTP_USER || "resend",
    pass: process.env.SMTP_PASS || "",
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const from = process.env.EMAIL_FROM || "PrintSafe <onboarding@resend.dev>";

  try {
    return await emailTransporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ""),
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // If Resend free testing sandbox blocks non-registered recipient (550 error)
    if (errMsg.includes("550") || errMsg.includes("testing emails")) {
      console.warn(
        `\n⚠️  [Resend Sandbox Notice] Live email to "${to}" was blocked by Resend free tier.\n` +
          `   Resend requires domain verification at resend.com/domains to send to arbitrary addresses.\n` +
          `   In testing/dev mode, emails can only be delivered to your Resend account email (alvinxsonny@gmail.com).\n`
      );
      return {
        accepted: [],
        rejected: [to],
        response: "Suppressed Resend 550 test sandbox restriction",
      };
    }
    throw err;
  }
}

export async function sendOtpEmail(
  to: string,
  otp: string,
  roleName: string = "Customer"
) {
  // Store in memory for instant dev/test access
  storeDevOtp(to, otp);

  // Always log OTP prominently in server console for friction-free local testing
  console.log(`\n======================================================`);
  console.log(`🔑 [PrintSafe OTP Code] To: ${to} (${roleName})`);
  console.log(`👉 Verification Passcode: ${otp}`);
  console.log(`======================================================\n`);

  const subject = `Your PrintSafe Verification Code: ${otp}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PrintSafe Verification Code</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #F5F2EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #FBF9F3; border: 1px solid #DED7C6; border-radius: 24px; padding: 32px; box-shadow: 0 4px 16px rgba(20, 33, 61, 0.08);">
    <tr>
      <td>
        <div style="display: inline-block; padding: 6px 14px; background-color: #3DD68C; color: #14213D; font-weight: 700; font-size: 13px; border-radius: 9999px; margin-bottom: 20px;">
          PrintSafe ${roleName} Auth
        </div>
        
        <h1 style="color: #14213D; font-size: 24px; font-weight: 800; margin: 0 0 12px 0;">
          Your One-Time Passcode
        </h1>
        
        <p style="color: #4A5568; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Use the 6-digit code below to securely verify your email address. This passcode is valid for the next 10 minutes.
        </p>

        <div style="background-color: #EAE4D4; border: 1px solid #D8D0BE; border-radius: 18px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: 'Space Grotesk', ui-monospace, Menlo, Monaco, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #12724A;">
            ${otp}
          </span>
        </div>

        <p style="color: #4A5568; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
          <strong>Security Promise:</strong> PrintSafe never shares your email or phone number with print shops. Merchants only see an anonymous customer alias.
        </p>

        <hr style="border: none; border-top: 1px solid #DED7C6; margin: 24px 0;" />

        <p style="color: #A0AEC0; font-size: 12px; margin: 0;">
          If you did not request this login code, no action is needed. Your account remains completely secure.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}

export async function sendJobAcceptedEmail(params: {
  to: string;
  shopName: string;
  jobId: string;
  mode: "near" | "far";
  passcode?: string;
}) {
  const { to, shopName, jobId, mode, passcode } = params;
  const subject = `PrintSafe: Your print request was accepted by ${shopName}`;
  const shortId = jobId.slice(-6).toUpperCase();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 32px 16px; background-color: #F5F2EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #FBF9F3; border: 1px solid #DED7C6; border-radius: 24px; padding: 32px;">
    <tr>
      <td>
        <div style="display: inline-block; padding: 6px 14px; background-color: #3DD68C; color: #14213D; font-weight: 700; font-size: 12px; border-radius: 9999px; margin-bottom: 16px;">
          Order Accepted &bull; #${shortId}
        </div>
        <h1 style="color: #14213D; font-size: 22px; font-weight: 800; margin: 0 0 12px 0;">
          ${shopName} accepted your request
        </h1>
        <p style="color: #4A5568; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          ${
            mode === "near"
              ? `Your walk-in order is ready. When you arrive at the counter, show your secure 4-digit code: <strong style="font-size: 18px; color: #12724A; letter-spacing: 2px;">${passcode || "See in app"}</strong>`
              : `Your remote order has been accepted. Please open the PrintSafe app to complete payment and release your document to the printer queue.`
          }
        </p>
        <p style="color: #718096; font-size: 12px; margin: 0;">
          PrintSafe protects your documents: the merchant views rendered pages directly and cannot save or forward your files.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}

export async function sendJobRejectedEmail(params: {
  to: string;
  shopName: string;
  jobId: string;
  reason?: string;
}) {
  const { to, shopName, jobId, reason } = params;
  const shortId = jobId.slice(-6).toUpperCase();
  const subject = `PrintSafe: Update on print request #${shortId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 32px 16px; background-color: #F5F2EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #FBF9F3; border: 1px solid #DED7C6; border-radius: 24px; padding: 32px;">
    <tr>
      <td>
        <h2 style="color: #14213D; font-size: 20px; font-weight: 800; margin: 0 0 12px 0;">
          Print Request Declined
        </h2>
        <p style="color: #4A5568; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Unfortunately, <strong>${shopName}</strong> could not accept your print request #${shortId}.
          ${reason ? `<br /><strong>Reason:</strong> ${reason}` : ""}
        </p>
        <p style="color: #4A5568; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">
          If you made an online pre-payment, an automatic full refund has been initiated back to your original payment method.
        </p>
        <p style="color: #718096; font-size: 12px; margin: 0;">
          You can select another live print shop near you on the PrintSafe map.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}
