import nodemailer from "nodemailer";

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

  return emailTransporter.sendMail({
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ""),
  });
}

export async function sendOtpEmail(
  to: string,
  otp: string,
  roleName: string = "Customer"
) {
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
