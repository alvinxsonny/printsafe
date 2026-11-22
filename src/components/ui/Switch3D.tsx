"use client";

import React, { useRef, useState, useEffect } from "react";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const [travelDistance, setTravelDistance] = useState<number | null>(null);

  useEffect(() => {
    const btn = buttonRef.current;
    const thumb = thumbRef.current;
    if (!btn || !thumb) return;

    const updateDistance = () => {
      const style = window.getComputedStyle(btn);
      const paddingLeft = parseFloat(style.paddingLeft) || 6;
      const paddingRight = parseFloat(style.paddingRight) || 6;
      const maxTravel =
        btn.clientWidth - paddingLeft - paddingRight - thumb.offsetWidth;
      setTravelDistance(Math.max(0, maxTravel));
    };

    updateDistance();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateDistance);
      observer.observe(btn);
      return () => observer.disconnect();
    }
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex items-center select-none cursor-pointer rounded-full p-1.5 transition-colors duration-300",
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
          "absolute text-xs font-black tracking-wider transition-opacity duration-200 select-none pointer-events-none",
          checked
            ? "left-3.5 text-zinc-950 opacity-100"
            : "right-3.5 text-[var(--text-muted)] opacity-100"
        )}
      >
        {checked ? labelOn : labelOff}
      </span>

      {/* 3D Physical Thumb */}
      <span
        ref={thumbRef}
        style={{
          transform: checked
            ? travelDistance !== null
              ? `translateX(${travelDistance}px)`
              : "translateX(5.5rem)"
            : "translateX(0px)",
        }}
        className={cn(
          "inline-block h-full aspect-square rounded-full bg-[var(--surface)] border border-[var(--border)]",
          "extrude-sm transition-transform duration-300 ease-out flex items-center justify-center font-bold text-xs select-none",
          checked
            ? "text-[#12724A] shadow-md"
            : "text-[var(--text-muted)] shadow"
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
