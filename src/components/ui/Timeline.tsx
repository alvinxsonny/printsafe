import React from "react";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string | number;
  title: string;
  timestamp?: string;
  description?: string;
  status?: "completed" | "current" | "pending";
}

export interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn("relative pl-6 space-y-6", className)}>
      {/* Vertical connector line */}
      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[var(--border)]" />

      {events.map((evt) => {
        const isCompleted = evt.status === "completed";
        const isCurrent = evt.status === "current";

        return (
          <div key={evt.id} className="relative flex items-start gap-4">
            {/* 3D Indicator Dot */}
            <div
              className={cn(
                "absolute -left-6 mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200 extrude-sm",
                isCompleted && "bg-[var(--accent-fill)] border-[#2EB673]",
                isCurrent &&
                  "bg-[var(--surface)] border-[var(--accent)] ring-4 ring-[var(--accent)]/20 animate-pulse",
                !isCompleted &&
                  !isCurrent &&
                  "bg-[var(--surface-2)] border-[var(--border)]"
              )}
            >
              {isCompleted && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#12724A]" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h5
                  className={cn(
                    "text-sm font-bold",
                    isCurrent
                      ? "text-[var(--text)]"
                      : "text-[var(--text-muted)]"
                  )}
                >
                  {evt.title}
                </h5>
                {evt.timestamp && (
                  <span className="text-xs font-medium tabular-nums text-[var(--text-muted)]">
                    {evt.timestamp}
                  </span>
                )}
              </div>
              {evt.description && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {evt.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
