"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  MapPin,
  CheckCheck,
  Trash2,
  Navigation,
  Shield,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Card3D, Button3D, Badge } from "@/components/ui";
import { PushPromptBanner } from "@/components/notifications/PushPromptBanner";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  payload: {
    message?: string;
    jobId?: string;
    shopId?: string;
    shopName?: string;
    status?: string;
  };
  readAt: string | null;
  createdAt: string;
}

interface NotifyArea {
  lat: number;
  lng: number;
  radiusM: number;
}

export function CustomerNotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Area alert state
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyArea, setNotifyArea] = useState<NotifyArea | null>(null);
  const [isUpdatingArea, setIsUpdatingArea] = useState(false);
  const [areaRadius, setAreaRadius] = useState<number>(3000);
  const [areaMessage, setAreaMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [resNotifs, resArea] = await Promise.all([
        fetch("/api/notifications"),
        fetch("/api/customer/notify-area"),
      ]);

      if (resNotifs.ok) {
        const notifData = await resNotifs.json();
        setNotifications(notifData.notifications || []);
        setUnreadCount(notifData.unreadCount || 0);
      }

      if (resArea.ok) {
        const areaData = await resArea.json();
        setNotifyEnabled(Boolean(areaData.notifyEnabled));
        setNotifyArea(areaData.notifyArea || null);
        if (areaData.notifyArea?.radiusM) {
          setAreaRadius(areaData.notifyArea.radiusM);
        }
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
        const [resNotifs, resArea] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/customer/notify-area"),
        ]);
        if (!ignore) {
          if (resNotifs.ok) {
            const notifData = await resNotifs.json();
            setNotifications(notifData.notifications || []);
            setUnreadCount(notifData.unreadCount || 0);
          }
          if (resArea.ok) {
            const areaData = await resArea.json();
            setNotifyEnabled(Boolean(areaData.notifyEnabled));
            setNotifyArea(areaData.notifyArea || null);
            if (areaData.notifyArea?.radiusM) {
              setAreaRadius(areaData.notifyArea.radiusM);
            }
          }
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

  // Update Area Alert using Geolocation
  async function handleSetLocationArea() {
    if (!navigator.geolocation) {
      setAreaMessage("Geolocation is not supported by your browser.");
      return;
    }

    setIsUpdatingArea(true);
    setAreaMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/customer/notify-area", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enabled: true,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              radiusM: areaRadius,
            }),
          });

          const data = await res.json();
          if (res.ok) {
            setNotifyEnabled(true);
            setNotifyArea(data.notifyArea);
            setAreaMessage("Alert area saved with ~500m privacy grid.");
          } else {
            setAreaMessage(data.error || "Failed to update alert area.");
          }
        } catch {
          setAreaMessage("Network error updating area.");
        } finally {
          setIsUpdatingArea(false);
        }
      },
      () => {
        setIsUpdatingArea(false);
        setAreaMessage(
          "Location access was denied. Please allow location permissions to set your alert area."
        );
      },
      { timeout: 10000 }
    );
  }

  // Delete saved area
  async function handleDeleteArea() {
    setIsUpdatingArea(true);
    setAreaMessage(null);
    try {
      const res = await fetch("/api/customer/notify-area", {
        method: "DELETE",
      });
      if (res.ok) {
        setNotifyEnabled(false);
        setNotifyArea(null);
        setAreaMessage(
          "Saved area deleted. You will not receive nearby live alerts."
        );
      }
    } finally {
      setIsUpdatingArea(false);
    }
  }

  return (
    <CustomerShell userAlias="Notifications">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Notifications &amp; Alerts
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Real-time updates on your print jobs, shop openings, and security
              events.
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

        {/* Web Push Prompt Banner */}
        <PushPromptBanner onSubscribed={loadData} />

        {/* "Shop Went Live Nearby" Section (Section 13 Task 4) */}
        <Card3D className="p-6 space-y-5 bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent-fill)]/20 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0 extrude-sm mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-[var(--text)]">
                    Nearby Shop Live Alerts
                  </h3>
                  <Badge variant={notifyEnabled ? "live" : "neutral"} size="sm">
                    {notifyEnabled ? "ACTIVE" : "OFF"}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Get notified when a verified photocopy or Xerox shop opens
                  near you. Maximum 3 alerts a day to avoid disruption.
                </p>
              </div>
            </div>

            {notifyEnabled && (
              <Button3D
                variant="danger"
                size="sm"
                disabled={isUpdatingArea}
                onClick={handleDeleteArea}
                className="text-xs font-bold shrink-0 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Area</span>
              </Button3D>
            )}
          </div>

          {/* Privacy Guarantee Note */}
          <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-start gap-2.5 text-xs text-[var(--text-muted)]">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Privacy Protection:</strong> We store only a rounded
              location (~500 m grid cell) and alert radius. Your exact address
              is never saved or shared with merchants.
            </p>
          </div>

          {/* Active Area Details or Setup */}
          {notifyEnabled && notifyArea ? (
            <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-[var(--text)] flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Grid Area: ~{notifyArea.lat.toFixed(3)}° N,{" "}
                  {notifyArea.lng.toFixed(3)}° E
                </span>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  Radius: {notifyArea.radiusM / 1000} km range
                </p>
              </div>

              <Button3D
                variant="secondary"
                size="sm"
                disabled={isUpdatingArea}
                onClick={handleSetLocationArea}
                className="text-xs font-bold"
              >
                {isUpdatingArea ? "Updating..." : "Refresh Location"}
              </Button3D>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)] font-semibold">
                  Alert Radius:
                </span>
                <select
                  value={areaRadius}
                  onChange={(e) => setAreaRadius(Number(e.target.value))}
                  className="bg-[var(--surface-2)] border border-[var(--border)] text-xs rounded-xl px-3 py-1 font-mono font-bold text-[var(--text)]"
                >
                  <option value={1000}>1 km</option>
                  <option value={3000}>3 km (Recommended)</option>
                  <option value={5000}>5 km</option>
                </select>
              </div>

              <Button3D
                variant="primary"
                size="sm"
                disabled={isUpdatingArea}
                onClick={handleSetLocationArea}
                className="text-xs font-bold flex items-center justify-center gap-1.5"
              >
                {isUpdatingArea ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Detecting location...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Set Alert Area from Location</span>
                  </>
                )}
              </Button3D>
            </div>
          )}

          {areaMessage && (
            <p className="text-xs font-medium text-[var(--accent)]">
              {areaMessage}
            </p>
          )}
        </Card3D>

        {/* Notifications List Card */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text)] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--accent)]" />
              Inbox ({notifications.length})
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
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Bell className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50" />
                <h4 className="text-sm font-bold text-[var(--text)]">
                  No notifications
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Updates on your print requests and nearby shops will appear
                  here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.readAt;
                const targetJobId = item.payload.jobId;
                const targetShopId = item.payload.shopId;

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
                        <Badge variant="neutral" size="sm">
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
                        {item.payload.message || "Notification alert"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {targetJobId && (
                        <Link href={`/app/jobs/${targetJobId}`}>
                          <Button3D
                            variant="secondary"
                            size="sm"
                            className="text-xs font-bold flex items-center gap-1"
                          >
                            <span>View Job</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button3D>
                        </Link>
                      )}

                      {targetShopId && (
                        <Link href={`/app?shop=${targetShopId}`}>
                          <Button3D
                            variant="secondary"
                            size="sm"
                            className="text-xs font-bold flex items-center gap-1"
                          >
                            <span>View Shop</span>
                            <ExternalLink className="w-3 h-3" />
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
    </CustomerShell>
  );
}
