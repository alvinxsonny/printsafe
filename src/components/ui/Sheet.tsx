"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  side?: "bottom" | "right" | "left";
  children: React.ReactNode;
  className?: string;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  side = "right",
  children,
  className,
}: SheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sideClasses = {
    right:
      "fixed right-0 top-0 bottom-0 w-full max-w-md border-l border-[var(--border)] rounded-l-[28px] animate-in slide-in-from-right duration-200",
    left: "fixed left-0 top-0 bottom-0 w-full max-w-md border-r border-[var(--border)] rounded-r-[28px] animate-in slide-in-from-left duration-200",
    bottom:
      "fixed bottom-0 left-0 right-0 w-full max-h-[85vh] border-t border-[var(--border)] rounded-t-[28px] animate-in slide-in-from-bottom duration-200",
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "z-10 bg-[var(--surface)] p-6 extrude-lg overflow-y-auto flex flex-col",
          sideClasses[side],
          className
        )}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          {title ? (
            <h3 className="text-lg font-bold text-[var(--text)]">{title}</h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Close sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="pt-4 flex-1">{children}</div>
      </div>
    </div>
  );
}
