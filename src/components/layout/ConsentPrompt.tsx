"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CURRENT_POLICY_VERSION } from "@/config/app";
import { Button3D } from "@/components/ui/Button3D";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export function ConsentPrompt({
  userPolicyVersion,
}: {
  userPolicyVersion?: string | null;
}) {
  const [needsConsent, setNeedsConsent] = useState(
    () =>
      typeof userPolicyVersion !== "undefined" &&
      userPolicyVersion !== CURRENT_POLICY_VERSION
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (typeof userPolicyVersion === "undefined") {
      fetch("/api/auth/consent")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!ignore && data?.needsConsent) {
            setNeedsConsent(true);
          }
        })
        .catch(() => {});
    }
    return () => {
      ignore = true;
    };
  }, [userPolicyVersion]);

  if (!needsConsent) return null;

  async function handleAccept() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/consent", { method: "POST" });
      if (res.ok) {
        setNeedsConsent(false);
      }
    } catch {
      // Ignored
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="Policy Update Notice"
      className="bg-[var(--surface-2)] border-b border-[var(--border)] px-4 py-3 text-xs text-[var(--text)] transition-all z-30 relative"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#12724A] dark:text-[var(--accent)] shrink-0" />
          <p className="leading-snug">
            <span className="font-bold">
              Policy Update (v{CURRENT_POLICY_VERSION}):
            </span>{" "}
            We&apos;ve updated our{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="font-bold text-[var(--accent)] underline hover:text-[var(--text)]"
            >
              Privacy Notice
            </Link>{" "}
            and{" "}
            <Link
              href="/terms"
              target="_blank"
              className="font-bold text-[var(--accent)] underline hover:text-[var(--text)]"
            >
              Terms of Service
            </Link>{" "}
            for DPDP compliance.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button3D
            variant="primary"
            size="sm"
            onClick={handleAccept}
            disabled={isSubmitting}
            className="text-xs font-bold px-3 py-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>I Accept</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </>
            )}
          </Button3D>
        </div>
      </div>
    </div>
  );
}
