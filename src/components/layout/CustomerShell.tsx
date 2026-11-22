"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, FolderLock, History, User } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ConsentPrompt } from "@/components/layout/ConsentPrompt";
import { cn } from "@/lib/utils";

export interface CustomerShellProps {
  children: React.ReactNode;
  userAlias?: string;
}

export function CustomerShell({
  children,
  userAlias = "Customer (Guest)",
}: CustomerShellProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Map", href: "/app", icon: MapPin },
    { label: "Vault", href: "/app/vault", icon: FolderLock },
    { label: "Jobs", href: "/app/jobs", icon: History },
    { label: "Settings", href: "/app/settings", icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] pb-20 md:pb-0">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2 group">
            <Logo size={32} />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-2xl border border-[var(--border)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 select-none",
                    isActive
                      ? "bg-[var(--surface)] text-[var(--text)] extrude-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Alias Pill, Notification Bell & Theme Toggle */}
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-fill)]" />
              {userAlias}
            </span>
            <NotificationBell targetHref="/app/notifications" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* DPDP Policy Version Consent Re-prompt (Phase 15 Task 2) */}
      <ConsentPrompt />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
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
