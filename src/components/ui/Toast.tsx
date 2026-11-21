"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextType {
  toast: (options: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, type = "info" }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, description, type }]);

      setTimeout(() => {
        dismiss(id);
      }, 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]",
              "extrude-md transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in",
              item.type === "success" && "border-[#3DD68C]/40",
              item.type === "error" && "border-[var(--danger)]/40"
            )}
          >
            {item.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-[#12724A] shrink-0 mt-0.5" />
            )}
            {item.type === "error" && (
              <AlertCircle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
            )}
            {item.type === "info" && (
              <Info className="w-5 h-5 text-[var(--info)] shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--text)]">
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {item.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] p-0.5 rounded-lg"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
