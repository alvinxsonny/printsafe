"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  Loader2,
  FileCheck,
} from "lucide-react";
import { Card3D, Button3D } from "@/components/ui";

interface ReviewActionsProps {
  shopId: string;
  shopStatus: string;
  isSelfOwner: boolean;
}

export function ReviewActions({
  shopId,
  shopStatus,
  isSelfOwner,
}: ReviewActionsProps) {
  const router = useRouter();

  const [checklist, setChecklist] = useState({
    storefrontMatchesName: false,
    pinIsRealLocation: false,
    phoneReachable: false,
    noDuplicate: false,
  });

  const [notes, setNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleDecision(decision: string) {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (decision !== "approved" && !notes.trim()) {
      setErrorMessage(
        "Notes are required when requesting changes, rejecting, or suspending a storefront."
      );
      return;
    }

    setSubmittingDecision(decision);

    try {
      const res = await fetch(`/api/admin/merchants/${shopId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          checklist,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process decision.");
      }

      setSuccessMessage(`Decision "${decision}" saved successfully.`);
      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to record review decision";
      setErrorMessage(msg);
    } finally {
      setSubmittingDecision(null);
    }
  }

  const allChecked =
    checklist.storefrontMatchesName &&
    checklist.pinIsRealLocation &&
    checklist.phoneReachable &&
    checklist.noDuplicate;

  return (
    <Card3D className="p-6 space-y-5 border border-[var(--border)]">
      <div className="flex items-center gap-2">
        <FileCheck className="w-5 h-5 text-[var(--accent)]" />
        <h3 className="text-sm font-extrabold tracking-tight uppercase">
          Verification Checklist & Decision
        </h3>
      </div>

      {isSelfOwner && (
        <div className="p-3.5 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs text-[var(--danger)] font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          You own this storefront. Admins are strictly prohibited from reviewing
          or approving their own shop.
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs text-[var(--danger)] font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-[#3DD68C]/20 border border-[#2EB673] text-xs text-[#12724A] dark:text-[#3DD68C] font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Checklist Checkboxes */}
      <div className="space-y-2.5 pt-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
          Required Verification Checks
        </label>
        <div className="space-y-2 bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--border)] text-xs">
          {[
            {
              key: "storefrontMatchesName",
              label: "Storefront photo / signage matches registered name",
            },
            {
              key: "pinIsRealLocation",
              label: "Pin coordinates match genuine physical commercial shop",
            },
            {
              key: "phoneReachable",
              label: "Shop phone number verified or reachable",
            },
            {
              key: "noDuplicate",
              label: "No duplicate storefront or Google Feature ID conflict",
            },
          ].map((item) => {
            const checked = checklist[item.key as keyof typeof checklist];
            return (
              <label
                key={item.key}
                className="flex items-center gap-3 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isSelfOwner}
                  onChange={(e) =>
                    setChecklist((prev) => ({
                      ...prev,
                      [item.key]: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[var(--accent)] rounded cursor-pointer"
                />
                <span
                  className={`font-medium ${
                    checked
                      ? "text-[var(--text)] font-bold"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {item.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Review Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
          Admin Notes (Mandatory for changes/reject/suspend)
        </label>
        <textarea
          rows={3}
          value={notes}
          disabled={isSelfOwner}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Detailed notes explaining any issues, required changes, or approval verification log..."
          className="w-full p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-wrap gap-2.5 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Request Changes */}
          <Button3D
            variant="secondary"
            size="sm"
            disabled={isSelfOwner || Boolean(submittingDecision)}
            onClick={() => handleDecision("changes_requested")}
            className="flex items-center gap-1.5"
          >
            {submittingDecision === "changes_requested" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-[var(--warm)]" />
            )}
            Request Changes
          </Button3D>

          {/* Reject */}
          <Button3D
            variant="danger"
            size="sm"
            disabled={isSelfOwner || Boolean(submittingDecision)}
            onClick={() => handleDecision("rejected")}
            className="flex items-center gap-1.5"
          >
            {submittingDecision === "rejected" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            Reject
          </Button3D>

          {/* Suspend / Reinstate if already approved or suspended */}
          {shopStatus === "approved" && (
            <Button3D
              variant="secondary"
              size="sm"
              disabled={isSelfOwner || Boolean(submittingDecision)}
              onClick={() => handleDecision("suspended")}
              className="flex items-center gap-1.5 text-[var(--danger)]"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              Suspend
            </Button3D>
          )}

          {shopStatus === "suspended" && (
            <Button3D
              variant="secondary"
              size="sm"
              disabled={isSelfOwner || Boolean(submittingDecision)}
              onClick={() => handleDecision("reinstated")}
              className="flex items-center gap-1.5 text-[var(--accent)]"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Reinstate
            </Button3D>
          )}
        </div>

        {/* Approve Button */}
        <Button3D
          variant="primary"
          size="sm"
          disabled={
            isSelfOwner ||
            !allChecked ||
            Boolean(submittingDecision) ||
            shopStatus === "approved"
          }
          onClick={() => handleDecision("approved")}
          className="flex items-center gap-1.5 px-5"
        >
          {submittingDecision === "approved" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          )}
          {shopStatus === "approved"
            ? "Already Approved"
            : "Approve & Grant Trial"}
        </Button3D>
      </div>
    </Card3D>
  );
}
