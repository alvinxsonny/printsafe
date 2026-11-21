"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface Button3DProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button3D = React.forwardRef<HTMLButtonElement, Button3DProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-semibold select-none cursor-pointer " +
      "transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] " +
      "disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none";

    const sizeStyles = {
      sm: "h-9 px-3.5 text-xs rounded-xl gap-1.5",
      md: "h-11 px-5 text-sm rounded-2xl gap-2",
      lg: "h-14 px-7 text-base rounded-2xl gap-2.5",
    };

    const variantStyles = {
      primary:
        "bg-[var(--accent-fill)] text-[#14213D] extrude-accent-md hover:-translate-y-0.5 " +
        "active:translate-y-1 active:shadow-none border border-[#2EB673]/30",
      secondary:
        "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] extrude-md " +
        "hover:-translate-y-0.5 active:translate-y-1 active:shadow-none",
      danger:
        "bg-[var(--danger-fill)] text-white extrude-danger-md hover:-translate-y-0.5 " +
        "active:translate-y-1 active:shadow-none border border-[var(--danger-darker)]/40",
      outline:
        "bg-transparent text-[var(--text)] border-2 border-[var(--border)] hover:bg-[var(--surface-2)] " +
        "hover:-translate-y-0.5 active:translate-y-0.5",
      ghost:
        "bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)] active:translate-y-0.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button3D.displayName = "Button3D";
