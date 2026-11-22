"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  CreditCard,
} from "lucide-react";
import { MerchantShell } from "@/components/layout/MerchantShell";
import { Card3D, Button3D, Badge } from "@/components/ui";
import { PushPromptBanner } from "@/components/notifications/PushPromptBanner";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  payload: {
    message?: string;
    jobId?: string;
    status?: string;
    sheets?: number;
  };
  readAt: string | null;
  createdAt: string;
}

export function MerchantNotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const notifData = await res.json();
        setNotifications(notifData.notifications || []);
        setUnreadCount(notifData.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Failed to load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok && !ignore) {
          const notifData = await res.json();
          setNotifications(notifData.notifications || []);
          setUnreadCount(notifData.unreadCount || 0);
        }
      } catch (err) {
        console.warn("Failed to load notifications:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    void fetchData();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleMarkAllRead() {
    setIsMarkingAll(true);
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
        );
      }
    } finally {
      setIsMarkingAll(false);
    }
  }

  async function handleMarkSingleRead(id: string) {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Quiet ignore
    }
  }

  return (
    <MerchantShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Store Notifications
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Live alerts for print requests, review updates, subscription
              reminders, and payments.
            </p>
          </div>

          {unreadCount > 0 && (
            <Button3D
              variant="secondary"
              size="sm"
              disabled={isMarkingAll}
              onClick={handleMarkAllRead}
              className="text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              {isMarkingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              <span>Mark all as read</span>
            </Button3D>
          )}
        </div>

        {/* Counter Staff Web Push Setup */}
        <PushPromptBanner
          title="Terminal Push Alerts for New Print Orders"
          description="Enable browser push notifications on this terminal so counter operators get instant audio and push alerts whenever a customer sends a new print order."
          onSubscribed={loadData}
        />

        {/* Notifications List Card */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text)] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--accent)]" />
              Store Activity ({notifications.length})
            </h3>
            {unreadCount > 0 && (
              <Badge variant="live">{unreadCount} UNREAD</Badge>
            )}
          </div>

          <Card3D className="overflow-hidden divide-y divide-[var(--border)]">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                <p className="text-xs text-[var(--text-muted)]">
                  Loading store notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Bell className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50" />
                <h4 className="text-sm font-bold text-[var(--text)]">
                  No store notifications
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Incoming print orders and system updates will be logged here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.readAt;
                const isJob =
                  item.type.includes("job") || item.type.includes("request");

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isUnread) handleMarkSingleRead(item.id);
                    }}
                    className={cn(
                      "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
                      isUnread
                        ? "bg-[var(--accent-fill)]/5 hover:bg-[var(--accent-fill)]/10"
                        : "hover:bg-[var(--surface-2)]/50 text-[var(--text-muted)]"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                        )}
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          {new Date(item.createdAt).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        <Badge
                          variant={
                            item.type === "new_print_request"
                              ? "live"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {item.type.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </div>

                      <p
                        className={cn(
                          "text-xs leading-relaxed",
                          isUnread
                            ? "text-[var(--text)] font-semibold"
                            : "text-[var(--text)]"
                        )}
                      >
                        {item.payload.message || "Notification event recorded."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isJob && (
                        <Link href="/merchant/queue">
                          <Button3D
                            variant="primary"
                            size="sm"
                            className="text-xs font-bold flex items-center gap-1"
                          >
                            <span>Open Queue</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button3D>
                        </Link>
                      )}

                      {item.type.includes("subscription") && (
                        <Link href="/merchant/billing">
                          <Button3D
                            variant="secondary"
                            size="sm"
                            className="text-xs font-bold flex items-center gap-1"
                          >
                            <span>Manage Plan</span>
                            <CreditCard className="w-3 h-3" />
                          </Button3D>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Card3D>
        </div>
      </div>
    </MerchantShell>
  );
}
