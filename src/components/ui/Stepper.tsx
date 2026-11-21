import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface Step {
  id: string | number;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("w-full flex items-center justify-between", className)}>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs select-none border transition-all duration-200",
                  "extrude-sm",
                  isCompleted &&
                    "bg-[var(--accent-fill)] border-[#2EB673] text-[#14213D]",
                  isCurrent &&
                    "bg-[var(--surface)] border-[var(--accent)] text-[var(--accent)] ring-2 ring-[var(--accent)]/30",
                  !isCompleted &&
                    !isCurrent &&
                    "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[3]" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-semibold mt-2 text-center select-none",
                  isCurrent
                    ? "text-[var(--text)] font-bold"
                    : "text-[var(--text-muted)]"
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-1.5 mx-2 rounded-full transition-colors duration-200 -mt-6",
                  idx < currentStep
                    ? "bg-[var(--accent-fill)]"
                    : "bg-[var(--surface-2)]"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
