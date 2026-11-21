"use client";

import React from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${resolvedTheme === "light" ? "dark" : "light"} theme`}
      className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-2xl",
        "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]",
        "extrude-sm hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        className
      )}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-5 h-5 text-[var(--warm-fill)] transition-transform rotate-0 scale-100" />
      ) : (
        <Moon className="w-5 h-5 text-[var(--info)] transition-transform rotate-0 scale-100" />
      )}
    </button>
  );
}
