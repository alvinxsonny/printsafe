"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  payload: {
    message?: string;
    jobId?: string;
    shopName?: string;
    status?: string;
  };
  readAt: string | null;
  createdAt: string;
}

interface NotificationBellProps {
  targetHref: string;
  className?: string;
  dropDirection?: "down" | "up";
}

export function NotificationBell({
  targetHref,
  className,
  dropDirection = "down",
}: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentList, setRecentList] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    async function loadNotifs() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok && !ignore) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
          setRecentList((data.notifications || []).slice(0, 4));
        }
      } catch {
        // Quiet background poll
      }
    }

    void loadNotifs();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadNotifs();
      }
    }, 15000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleMarkAllRead(e: React.MouseEvent) {
    e.stopPropagation();
    setIsMarking(true);
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setRecentList((prev) =>
          prev.map((item) => ({ ...item, readAt: new Date().toISOString() }))
        );
      }
    } finally {
      setIsMarking(false);
    }
  }

  return (
    <div className={cn("relative inline-block", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className={cn(
          "relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] select-none",
          unreadCount > 0 && "text-[var(--accent)] border-[var(--accent)]/50"
        )}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[var(--accent-fill)] text-zinc-950 text-[10px] font-black font-mono tracking-tight extrude-accent-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "w-80 sm:w-96 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl z-50 p-4 space-y-3 extrude-md animate-in fade-in zoom-in-95",
            dropDirection === "up"
              ? "absolute left-0 bottom-full mb-2 origin-bottom-left"
              : "absolute right-0 mt-2 origin-top-right"
          )}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-[var(--text)] tracking-tight">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent-fill)]/20 text-[var(--accent)] text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarking}
                className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                {isMarking ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3" />
                )}
                Mark read
              </button>
            )}
          </div>

          {/* List items */}
          <div className="space-y-2 max-h-64 overflow-y-auto divide-y divide-[var(--border)]/50">
            {recentList.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-6">
                No notifications yet.
              </p>
            ) : (
              recentList.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "pt-2 first:pt-0 text-xs space-y-0.5",
                    !item.readAt && "font-semibold"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!item.readAt && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--text)] line-clamp-2">
                    {item.payload.message || "Notification alert"}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-[var(--border)]">
            <Link
              href={targetHref}
              onClick={() => setIsOpen(false)}
              className="w-full py-1.5 text-center text-xs font-bold text-[var(--accent)] hover:underline flex items-center justify-center gap-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
