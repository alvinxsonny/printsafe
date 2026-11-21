"use client";

import React, { useState } from "react";
import { EditPlanModal } from "./EditPlanModal";
import { Card3D, Badge, Button3D } from "@/components/ui";
import { Layers, Edit3, ShieldAlert } from "lucide-react";
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

interface PlansManagerProps {
  initialPlans: PlanItem[];
}

export function PlansManager({ initialPlans }: PlansManagerProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);

  const merchantPlans = initialPlans.filter((p) => p.audience === "merchant");
  const customerPlans = initialPlans.filter((p) => p.audience === "customer");

  function renderPlanCard(plan: PlanItem) {
    return (
      <Card3D
        key={plan.id}
        className="p-5 flex flex-col justify-between space-y-4 border border-[var(--border)]"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                {plan.code}
              </span>
              <h3 className="text-base font-extrabold text-[var(--text)]">
                {plan.name}
              </h3>
            </div>
            <Badge variant={plan.active ? "approved" : "neutral"} size="sm">
              {plan.active ? "Active" : "Archived"}
            </Badge>
          </div>

          <div className="text-2xl font-black font-mono text-[var(--text)]">
            ₹{(plan.pricePaise / 100).toFixed(2)}{" "}
            <span className="text-xs font-normal text-[var(--text-muted)] font-sans">
              / {plan.periodDays} days
            </span>
          </div>

          <div className="space-y-1 bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border)] text-xs">
            {plan.audience === "merchant" ? (
              <>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-muted)]">Jobs Limit:</span>
                  <span className="font-bold">
                    {plan.limits.jobs_per_month === -1 ||
                    plan.limits.jobs_per_month === undefined
                      ? "Unlimited"
                      : `${plan.limits.jobs_per_month}/mo`}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-muted)]">
                    Unique Customers:
                  </span>
                  <span className="font-bold">
                    {plan.limits.customers_per_month === -1 ||
                    plan.limits.customers_per_month === null ||
                    plan.limits.customers_per_month === undefined
                      ? "Unlimited"
                      : `${plan.limits.customers_per_month}/mo`}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-muted)]">
                    Active Devices:
                  </span>
                  <span className="font-bold">
                    {plan.limits.devices ?? 1} device
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-muted)]">
                    Uploads Limit:
                  </span>
                  <span className="font-bold">
                    {plan.limits.uploads_per_month ?? 10}/mo
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-muted)]">Vault Size:</span>
                  <span className="font-bold">
                    {plan.limits.vault_mb ?? 100} MB
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--border)] flex justify-end">
          <Button3D
            variant="secondary"
            size="sm"
            onClick={() => setSelectedPlan(plan)}
            className="flex items-center gap-1.5 w-full justify-center"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Plan & Limits
          </Button3D>
        </div>
      </Card3D>
    );
  }

  return (
    <div className="space-y-8">
      {/* Merchant Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-base font-extrabold tracking-tight">
            Merchant Commercial Plans ({merchantPlans.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {merchantPlans.map(renderPlanCard)}
        </div>
      </div>

      {/* Customer Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--info)]" />
          <h2 className="text-base font-extrabold tracking-tight">
            Customer Vault Plans ({customerPlans.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customerPlans.map(renderPlanCard)}
        </div>
      </div>

      {/* Plan Policy Notice */}
      <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[var(--warm)] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-[var(--text)]">Audit Policy:</strong>{" "}
          Modifying a plan automatically records an immutable row in the audit
          log. Plan changes affect newly initiated purchases only; existing
          merchant and customer subscription periods remain fixed until renewal.
        </div>
      </div>

      {/* Edit Modal */}
      <EditPlanModal
        plan={selectedPlan}
        isOpen={Boolean(selectedPlan)}
        onClose={() => setSelectedPlan(null)}
      />
    </div>
  );
}
