import { Suspense } from "react";
import { NewJobClient } from "./NewJobClient";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Loader2 } from "lucide-react";

export const instant = false;

export default function NewJobPage() {
  return (
    <Suspense
      fallback={
        <CustomerShell userAlias="Print Order">
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            <p className="text-xs text-[var(--text-muted)] font-semibold">
              Loading order configuration...
            </p>
          </div>
        </CustomerShell>
      }
    >
      <NewJobClient />
    </Suspense>
  );
}
