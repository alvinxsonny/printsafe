"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Store,
  Layers,
  ScrollText,
  BarChart3,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

export interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/admin", icon: BarChart3 },
    { label: "Merchants Queue", href: "/admin/merchants", icon: Store },
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
            <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--danger)] extrude-sm">
              <ShieldAlert className="w-4 h-4" />
            </div>
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

        {/* Footer */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <Link
            href="/"
            className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ← Landing
          </Link>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main Dense Content Area */}
      <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
