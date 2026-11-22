"use client";

import React, { useSyncExternalStore } from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={
        mounted
          ? `Switch to ${resolvedTheme === "light" ? "dark" : "light"} theme`
          : "Toggle theme"
      }
      className={cn(
        "relative flex items-center justify-center w-9 h-9 rounded-md",
        "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]",
        "extrude-sm hover:-translate-y-0.5 active:translate-y-0.5 hover:border-[var(--accent)] transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer select-none",
        className
      )}
    >
      {mounted ? (
        resolvedTheme === "dark" ? (
          <Sun className="w-4 h-4 text-[var(--warm-fill)] transition-transform rotate-0 scale-100" />
        ) : (
          <Moon className="w-4 h-4 text-[var(--info)] transition-transform rotate-0 scale-100" />
        )
      ) : (
        <span className="w-4 h-4 inline-block" aria-hidden="true" />
      )}
    </button>
  );
}
