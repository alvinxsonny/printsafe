"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Button3D, Input } from "@/components/ui";
import { Loader2 } from "lucide-react";
import type { PlanLimits } from "@/config/plans";

interface PlanItem {
  id: string;
  code: string;
  name: string;
  audience: "merchant" | "customer";
  pricePaise: number;
  periodDays: number;
  limits: PlanLimits;
  active: boolean;
}

interface EditPlanModalProps {
  plan: PlanItem | null;
  isOpen: boolean;
  onClose: () => void;
}

function EditPlanForm({
  plan,
  onClose,
}: {
  plan: PlanItem;
  onClose: () => void;
}) {
  const router = useRouter();

  const [priceRupees, setPriceRupees] = useState(
    (plan.pricePaise / 100).toFixed(2)
  );
  const [periodDays, setPeriodDays] = useState(plan.periodDays.toString());
  const [active, setActive] = useState(plan.active);
  const [limitsJson, setLimitsJson] = useState(
    JSON.stringify(plan.limits, null, 2)
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNum = parseFloat(priceRupees);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Please provide a valid price.");
      return;
    }

    const daysNum = parseInt(periodDays, 10);
    if (isNaN(daysNum) || daysNum <= 0) {
      setError("Period days must be greater than 0.");
      return;
    }

    let parsedLimits: PlanLimits;
    try {
      parsedLimits = JSON.parse(limitsJson);
    } catch {
      setError("Invalid JSON format for plan limits.");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pricePaise: Math.round(priceNum * 100),
          periodDays: daysNum,
          limits: parsedLimits,
          active,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update plan.");
      }

      onClose();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update plan";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      {error && (
        <div className="p-3 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-[var(--danger)] font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-bold text-[var(--text)] uppercase block mb-1">
            Price (₹)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={priceRupees}
            onChange={(e) => setPriceRupees(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="font-bold text-[var(--text)] uppercase block mb-1">
            Period (Days)
          </label>
          <Input
            type="number"
            min="1"
            value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="font-bold text-[var(--text)] uppercase block mb-1">
          Plan Limits & Quotas (JSON)
        </label>
        <textarea
          rows={8}
          value={limitsJson}
          onChange={(e) => setLimitsJson(e.target.value)}
          className="w-full p-3 font-mono text-[11px] rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:ring-1 focus:ring-[var(--accent)]"
          required
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="plan-active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="w-4 h-4 accent-[var(--accent)] rounded cursor-pointer"
        />
        <label
          htmlFor="plan-active"
          className="font-bold text-[var(--text)] cursor-pointer select-none"
        >
          Plan Active for New Subscriptions
        </label>
      </div>

      <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
        <Button3D type="button" variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button3D>
        <Button3D type="submit" variant="primary" size="sm" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Save Plan & Log Audit"
          )}
        </Button3D>
      </div>
    </form>
  );
}

export function EditPlanModal({ plan, isOpen, onClose }: EditPlanModalProps) {
  if (!plan) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Plan: ${plan.name}`}>
      <EditPlanForm key={plan.id} plan={plan} onClose={onClose} />
    </Modal>
  );
}
