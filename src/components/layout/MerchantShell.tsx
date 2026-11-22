"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Settings,
  CreditCard,
  Store,
  Bell,
} from "lucide-react";
import { Switch3D } from "@/components/ui/Switch3D";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ConsentPrompt } from "@/components/layout/ConsentPrompt";
import { cn } from "@/lib/utils";

export interface MerchantShellProps {
  children: React.ReactNode;
  shopName?: string;
  isLiveInitial?: boolean;
  onLiveChange?: (live: boolean) => void;
}

export function MerchantShell({
  children,
  shopName = "Your Print Shop",
  isLiveInitial = false,
  onLiveChange,
}: MerchantShellProps) {
  const pathname = usePathname();
  const [isLive, setIsLive] = useState(isLiveInitial);
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggleLive(nextState: boolean) {
    if (isToggling) return;
    setIsToggling(true);
    setIsLive(nextState); // optimistic update

    try {
      const res = await fetch("/api/merchant/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualLive: nextState }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsLive(!nextState); // revert
        alert(data.error || "Failed to update storefront status");
      } else {
        if (onLiveChange) {
          onLiveChange(data.isLive);
        }
      }
    } catch {
      setIsLive(!nextState); // revert
      alert("Network error updating live status.");
    } finally {
      setIsToggling(false);
    }
  }

  const navItems = [
    { label: "Dashboard", href: "/merchant", icon: LayoutDashboard },
    { label: "Print Queue", href: "/merchant/queue", icon: Layers },
    { label: "Notifications", href: "/merchant/notifications", icon: Bell },
    { label: "Shop Settings", href: "/merchant/settings", icon: Settings },
    { label: "Billing & Plans", href: "/merchant/billing", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)] text-[var(--text)] pb-20 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-5 shrink-0 justify-between">
        <div className="flex flex-col gap-6">
          {/* Shop Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
            <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] extrude-sm">
              <Store className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold truncate text-[var(--text)]">
                {shopName}
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">
                Merchant Portal
              </p>
            </div>
          </div>

          {/* Physical Live Toggle */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
              Storefront Status
            </span>
            <Switch3D
              checked={isLive}
              onCheckedChange={handleToggleLive}
              labelOn="LIVE"
              labelOff="OFFLINE"
              className="w-full"
            />
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 select-none",
                    isActive
                      ? "bg-[var(--accent-fill)] text-zinc-950 extrude-accent-sm font-black"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer with ThemeToggle & NotificationBell */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ← Home
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell targetHref="/merchant/notifications" />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <header className="md:hidden sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[var(--accent)]" />
            <h4 className="text-sm font-bold truncate max-w-[140px] text-[var(--text)]">
              {shopName}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <Switch3D
              checked={isLive}
              onCheckedChange={handleToggleLive}
              className="w-28 h-10 text-[10px]"
            />
            <NotificationBell targetHref="/merchant/notifications" />
            <ThemeToggle />
          </div>
        </header>

        {/* DPDP Policy Version Consent Re-prompt (Phase 15 Task 2) */}
        <ConsentPrompt />

        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-lg border-t border-[var(--border)] px-4 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-150 select-none",
                isActive
                  ? "text-[#12724A] dark:text-[var(--accent)] font-bold scale-105"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-all",
                  isActive &&
                    "bg-[var(--accent-fill)]/20 border border-[var(--accent-fill)]/30 extrude-sm"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
