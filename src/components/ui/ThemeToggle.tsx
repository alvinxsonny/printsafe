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
        "relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150",
        "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]",
        "hover:text-[var(--text)] hover:bg-[var(--surface)] hover:border-[var(--accent)]",
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
