import React from "react";
import { cn } from "@/lib/utils";
import { EmptyStateBoxIllustration } from "./illustrations/EmptyStateBoxIllustration";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-[28px]",
        "bg-[var(--surface)] border border-[var(--border)] extrude-sm",
        className
      )}
    >
      <div className="mb-4">
        {icon || <EmptyStateBoxIllustration className="w-28 h-28 mx-auto" />}
      </div>
      <h3 className="text-lg font-bold text-[var(--text)] tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm mt-1.5 mb-6">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
