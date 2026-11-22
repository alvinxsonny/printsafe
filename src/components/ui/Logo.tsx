import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LogoProps {
  className?: string;
  imageClassName?: string;
  size?: number;
  showText?: boolean;
  textSize?: string;
}

export function Logo({
  className,
  imageClassName,
  size = 36,
  showText = true,
  textSize = "text-xl",
}: LogoProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-2.5 select-none", className)}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] extrude-sm flex items-center justify-center p-0.5 shadow-sm",
          imageClassName
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.png"
          alt="PrintSafe Logo"
          width={size * 2}
          height={size * 2}
          priority
          className="object-contain w-full h-full rounded-lg"
        />
      </div>
      {showText && (
        <span
          className={cn(
            "font-extrabold tracking-tight text-[var(--text)] font-sans",
            textSize
          )}
        >
          Print<span className="text-[var(--accent)]">Safe</span>
        </span>
      )}
    </div>
  );
}
