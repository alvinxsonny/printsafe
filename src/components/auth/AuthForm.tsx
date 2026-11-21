"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card3D, Button3D, Input, Badge, ThemeToggle } from "@/components/ui";
import {
  ShieldCheck,
  KeyRound,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export interface AuthFormProps {
  entrance:
    | "customer_signup"
    | "customer_login"
    | "merchant_signup"
    | "merchant_login"
    | "admin_login";
  title: string;
  subtitle: string;
  badgeText: string;
  badgeVariant?: "live" | "info" | "rejected" | "neutral";
  requireConsent?: boolean;
  footerLink: {
    prompt: string;
    linkText: string;
    href: string;
  };
  altPortalLink?: {
    prompt: string;
    linkText: string;
    href: string;
  };
}

export function AuthForm({
  entrance,
  title,
  subtitle,
  badgeText,
  badgeVariant = "info",
  requireConsent = false,
  footerLink,
  altPortalLink,
}: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (requireConsent && !consent) {
      setErrorMessage(
        "You must accept the Privacy Policy to create your account."
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, entrance }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to send passcode.");
        return;
      }

      setSuccessMessage(data.message || "Passcode sent to your inbox!");
      setStep("otp");
      setCooldown(60);
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otp || otp.trim().length < 6) {
      setErrorMessage("Please enter the 6-digit passcode.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: otp.trim(),
          entrance,
          consent: requireConsent ? consent : true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Invalid passcode.");
        return;
      }

      router.push(data.redirectUrl || "/app");
      router.refresh();
    } catch {
      setErrorMessage(
        "Verification error. Please check your passcode and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[var(--accent-fill)] border border-[#2EB673] flex items-center justify-center font-bold text-[#14213D] extrude-sm text-sm">
            PS
          </span>
          <span className="text-xl font-bold tracking-tight">
            Print
            <span className="text-[#12724A] dark:text-[var(--accent)]">
              Safe
            </span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Center Auth Card */}
      <main className="w-full max-w-md mx-auto my-8">
        <Card3D className="p-8 sm:p-10 flex flex-col gap-6">
          {/* Header Title */}
          <div>
            <Badge variant={badgeVariant} size="sm" className="mb-3">
              {badgeText}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)]">
              {title}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[var(--danger-fill)]/15 border border-[var(--danger-fill)]/30 text-xs text-[var(--danger)] font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && step === "otp" && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#3DD68C]/15 border border-[#3DD68C]/30 text-xs text-[#12724A] dark:text-[#3DD68C] font-semibold animate-in fade-in">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Step 1: Email Form */}
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
              <div className="relative">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              {requireConsent && (
                <label className="flex items-start gap-3 select-none cursor-pointer text-xs text-[var(--text-muted)] leading-relaxed">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded-lg accent-[#12724A] focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
                    required
                  />
                  <span>
                    I agree to the{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="underline font-semibold text-[var(--text)] hover:text-[var(--accent)]"
                    >
                      Privacy Notice
                    </Link>{" "}
                    and consent to zero-trust document encryption.
                  </span>
                </label>
              )}

              <Button3D
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full text-base font-bold"
              >
                Send One-Time Passcode <ArrowRight className="w-4 h-4 ml-1" />
              </Button3D>
            </form>
          ) : (
            /* Step 2: OTP Entry Form */
            <form
              onSubmit={handleVerifyOtp}
              className="flex flex-col gap-5 animate-in fade-in"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Enter 6-Digit Passcode
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="text-[var(--accent)] hover:underline font-semibold"
                  >
                    Change email
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    className="w-full h-14 px-4 text-center rounded-2xl bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] shadow-inner text-2xl font-bold tracking-[8px] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    required
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] text-center pt-1">
                  Sent to{" "}
                  <strong className="text-[var(--text)]">{email}</strong>
                </p>
              </div>

              <Button3D
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full text-base font-bold"
              >
                <KeyRound className="w-5 h-5 mr-1" /> Verify & Access Vault
              </Button3D>

              {/* Resend Cooldown */}
              <div className="text-center pt-1">
                {cooldown > 0 ? (
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">
                    Resend passcode in <strong>{cooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:underline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Resend Passcode
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Footer Navigation Links */}
          <div className="pt-4 border-t border-[var(--border)] flex flex-col gap-2.5 text-center text-xs text-[var(--text-muted)]">
            <p>
              {footerLink.prompt}{" "}
              <Link
                href={footerLink.href}
                className="font-bold text-[var(--text)] hover:text-[var(--accent)] underline"
              >
                {footerLink.linkText}
              </Link>
            </p>
            {altPortalLink && (
              <p>
                {altPortalLink.prompt}{" "}
                <Link
                  href={altPortalLink.href}
                  className="font-bold text-[var(--accent)] hover:underline"
                >
                  {altPortalLink.linkText}
                </Link>
              </p>
            )}
          </div>
        </Card3D>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[var(--text-muted)] py-4">
        PrintSafe Zero-Trust Printing Platform — Encrypted documents, never
        downloaded.
      </footer>
    </div>
  );
}
