"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, Loader2, X, ShieldAlert } from "lucide-react";
import { Card3D, Button3D } from "@/components/ui";
import {
  isPushNotificationSupported,
  subscribeToPush,
} from "@/lib/notify/pushClient";

interface PushPromptBannerProps {
  title?: string;
  description?: string;
  onSubscribed?: () => void;
  className?: string;
}

export function PushPromptBanner({
  title = "Enable Instant Push Alerts",
  description = "Receive instant real-time updates when your print order is accepted, documents are printed, or when shops open near you. No phone number or personal details required.",
  onSubscribed,
  className,
}: PushPromptBannerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function checkStatus() {
      try {
        const supported = isPushNotificationSupported();
        if (!ignore) {
          setIsSupported(supported);
        }
        if (!supported) return;

        const res = await fetch("/api/push/status");
        if (res.ok && !ignore) {
          const data = await res.json();
          setIsSubscribed(Boolean(data.isSubscribed));
        }
      } catch {
        // Ignore check failure
      }
    }
    void checkStatus();
    return () => {
      ignore = true;
    };
  }, []);

  if (!isSupported || isSubscribed || isDismissed) {
    return null;
  }

  async function handleSubscribe() {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await subscribeToPush();
    setIsLoading(false);

    if (result.success) {
      setIsSubscribed(true);
      if (onSubscribed) onSubscribed();
    } else {
      setErrorMessage(result.error || "Could not enable push notifications.");
    }
  }

  return (
    <Card3D
      className={`p-4 bg-[var(--surface-2)] border border-[var(--accent)]/40 relative space-y-3 ${
        className || ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-fill)]/20 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0 extrude-sm mt-0.5">
            <Bell className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-[var(--text)]">
              {title}
            </h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {errorMessage && (
        <p className="text-[11px] text-[var(--danger)] flex items-center gap-1 font-medium">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button3D
          variant="primary"
          size="sm"
          disabled={isLoading}
          onClick={handleSubscribe}
          className="text-xs font-bold flex items-center gap-1.5"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Enabling...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Enable Notifications</span>
            </>
          )}
        </Button3D>

        <Button3D
          variant="secondary"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="text-xs font-bold"
        >
          Maybe Later
        </Button3D>
      </div>
    </Card3D>
  );
}
