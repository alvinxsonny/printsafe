"use client";

import React, { useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  enableTilt?: boolean;
  intensity?: number;
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function Card3D({
  className,
  enableTilt = true,
  intensity = 1,
  children,
  ...props
}: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    // Very subtle minimal tilt (clamped to max ±1.2 deg)
    const rawX = -((mouseY / (rect.height / 2)) * intensity);
    const rawY = (mouseX / (rect.width / 2)) * intensity;
    const rotateX = Math.max(-1.2, Math.min(1.2, rawX));
    const rotateY = Math.max(-1.2, Math.min(1.2, rawY));

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  const style: React.CSSProperties = {
    transform:
      isHovered && enableTilt && !reducedMotion
        ? `perspective(1200px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateY(-1px)`
        : "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px)",
    transition: isHovered
      ? "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease"
      : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease",
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={cn(
        "rounded-[28px] bg-[var(--surface)] border border-[var(--border)] extrude-lg p-6",
        "transition-colors duration-150",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
