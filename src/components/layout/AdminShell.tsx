"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Store,
  Layers,
  ScrollText,
  BarChart3,
  Bell,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { performLogout } from "@/lib/auth/logout";
import { cn } from "@/lib/utils";

export interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/admin", icon: BarChart3 },
    { label: "Merchants Queue", href: "/admin/merchants", icon: Store },
    { label: "Notifications", href: "/admin/notifications", icon: Bell },
    { label: "Platform Plans", href: "/admin/plans", icon: Layers },
    { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)]">
      {/* Dense Desktop Sidebar */}
      <aside className="w-60 border-r border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-5">
          {/* Admin Header */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--border)]">
            <Logo size={32} showText={false} />
            <div>
              <h3 className="text-sm font-bold tracking-tight text-[var(--text)]">
                PrintSafe Admin
              </h3>
              <p className="text-[10px] text-[var(--text-muted)] font-mono">
                RESTRICTED
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 select-none",
                    isActive
                      ? "bg-[var(--surface-2)] text-[var(--text)] font-bold border border-[var(--border)] extrude-sm"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]/50 hover:text-[var(--text)]"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer with NotificationBell, ThemeToggle & LogOut */}
        <div className="pt-4 border-t border-[var(--border)] flex flex-col gap-3">
          <button
            onClick={() => void performLogout()}
            className="w-full h-8 px-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-red-500 hover:text-red-500 text-xs font-bold text-[var(--text-muted)] flex items-center justify-center gap-1.5 transition-colors"
            title="Log Out of Admin Console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              ← Landing
            </Link>
            <div className="flex items-center gap-2">
              <NotificationBell targetHref="/admin/notifications" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Dense Content Area */}
      <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
