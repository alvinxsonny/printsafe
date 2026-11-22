"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface Switch3DProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  labelOn?: string;
  labelOff?: string;
  className?: string;
}

export function Switch3D({
  checked,
  onCheckedChange,
  disabled = false,
  labelOn = "LIVE",
  labelOff = "OFFLINE",
  className,
}: Switch3DProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex items-center select-none cursor-pointer rounded-full p-1.5 transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        "w-36 h-14 extrude-sm border",
        checked
          ? "bg-[var(--accent-fill)] border-[var(--accent-fill-darker)] shadow-inner"
          : "bg-[var(--surface-2)] border-[var(--border)]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Background Labels */}
      <span
        className={cn(
          "absolute text-xs font-black tracking-wider transition-opacity duration-200 select-none",
          checked
            ? "left-3 text-zinc-950 opacity-100"
            : "right-3 text-[var(--text-muted)] opacity-100"
        )}
      >
        {checked ? labelOn : labelOff}
      </span>

      {/* 3D Physical Thumb */}
      <span
        className={cn(
          "inline-block w-11 h-11 rounded-full bg-[var(--surface)] border border-[var(--border)]",
          "extrude-sm transition-transform duration-300 ease-out flex items-center justify-center font-bold text-xs",
          checked
            ? "translate-x-[5.25rem] text-[#12724A] shadow-md"
            : "translate-x-0 text-[var(--text-muted)] shadow"
        )}
      >
        <span
          className={cn(
            "w-3 h-3 rounded-full transition-colors",
            checked ? "bg-[#12724A] animate-pulse" : "bg-[var(--text-muted)]/50"
          )}
        />
      </span>
    </button>
  );
}
