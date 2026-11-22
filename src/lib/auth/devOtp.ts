/**
 * In-memory store for recent OTPs to facilitate testing and local development
 * without SMTP or Resend domain verification hurdles.
 */
const recentOtps = new Map<string, { otp: string; timestamp: number }>();

export function storeDevOtp(email: string, otp: string): void {
  recentOtps.set(email.toLowerCase().trim(), { otp, timestamp: Date.now() });
}

export function getDevOtp(email: string): string | null {
  const record = recentOtps.get(email.toLowerCase().trim());
  if (!record) return null;
  // Valid for 10 minutes (600,000 ms)
  if (Date.now() - record.timestamp > 600000) {
    recentOtps.delete(email.toLowerCase().trim());
    return null;
  }
  return record.otp;
}
