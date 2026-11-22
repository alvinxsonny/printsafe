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
      <Image
        src="/logo.png"
        alt="PrintSafe Logo"
        width={size}
        height={size}
        priority
        className={cn("shrink-0 object-contain", imageClassName)}
        style={{ width: size, height: size }}
      />
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
