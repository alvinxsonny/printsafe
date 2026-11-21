import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "live"
    | "offline"
    | "approved"
    | "pending"
    | "rejected"
    | "info"
    | "neutral";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    live: "bg-[#3DD68C]/20 text-[#12724A] dark:text-[#3DD68C] border-[#3DD68C]/40",
    offline:
      "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]",
    approved:
      "bg-[#3DD68C]/20 text-[#12724A] dark:text-[#3DD68C] border-[#3DD68C]/40",
    pending:
      "bg-[var(--warm-fill)]/20 text-[var(--warm)] border-[var(--warm-fill)]/40",
    rejected:
      "bg-[var(--danger-fill)]/20 text-[var(--danger)] border-[var(--danger-fill)]/40",
    info: "bg-[var(--info-fill)]/20 text-[var(--info)] border-[var(--info-fill)]/40",
    neutral: "bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)]",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] rounded-lg",
    md: "px-3 py-1 text-xs rounded-xl",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-bold uppercase tracking-wider border select-none",
        "extrude-sm transition-all duration-150",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          variant === "live" && "bg-[#12724A] dark:bg-[#3DD68C] animate-pulse",
          variant === "approved" && "bg-[#12724A] dark:bg-[#3DD68C]",
          variant === "pending" && "bg-[var(--warm)]",
          variant === "rejected" && "bg-[var(--danger)]",
          variant === "info" && "bg-[var(--info)]",
          variant === "offline" && "bg-[var(--text-muted)]",
          variant === "neutral" && "bg-[var(--text-muted)]"
        )}
      />
      {children}
    </span>
  );
}
