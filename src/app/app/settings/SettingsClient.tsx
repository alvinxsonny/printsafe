"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Card3D, Button3D, Badge, Modal } from "@/components/ui";
import {
  User,
  ShieldCheck,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface SettingsClientProps {
  user: {
    id: string;
    alias: string;
    email: string;
    role: string;
    consentAt: string | null;
    policyVersion: string;
    createdAt: string;
  };
  profile: {
    planId: string;
    sheetsPrintedTotal: number;
  };
}

export function SettingsClient({ user, profile }: SettingsClientProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleExportData() {
    setIsExporting(true);
    try {
      const response = await fetch("/api/customer/export");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `printsafe-data-${user.alias.replace(/\s+/g, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError("You must type DELETE in all uppercase to proceed.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/customer/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: "DELETE" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      // Successfully deleted; redirect to landing page
      router.push("/?deleted=true");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deletion failed";
      setDeleteError(msg);
      setIsDeleting(false);
    }
  }

  return (
    <CustomerShell userAlias={user.alias}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">
            Account &amp; Privacy Settings
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage your zero-trust profile, DPDP compliance, data exports, and
            account deletion.
          </p>
        </div>

        {/* 1. Profile Overview Card */}
        <Card3D className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                Anonymous Identity
              </h2>
            </div>
            <Badge variant="live" size="sm">
              Zero-Trust Mask
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Public Alias</span>
              <p className="font-bold text-sm text-[var(--text)] mt-0.5">
                {user.alias}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Print shops only see this alias. Your phone number &amp; email
                are never shared.
              </p>
            </div>

            <div>
              <span className="text-[var(--text-muted)]">Account Email</span>
              <p className="font-mono text-xs text-[var(--text)] mt-0.5">
                {user.email}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Used solely for login OTP and transaction receipts.
              </p>
            </div>

            <div>
              <span className="text-[var(--text-muted)]">Active Tier</span>
              <p className="font-bold text-xs text-[var(--text)] mt-0.5 capitalize">
                {profile.planId.replace("customer_", "")} Plan
              </p>
            </div>

            <div>
              <span className="text-[var(--text-muted)]">Sheets Printed</span>
              <p className="font-mono font-bold text-xs text-[var(--text)] mt-0.5">
                {profile.sheetsPrintedTotal} sheets
              </p>
            </div>
          </div>
        </Card3D>

        {/* 2. Privacy & Compliance Card */}
        <Card3D className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                Consent &amp; Data Rights (DPDP Act)
              </h2>
            </div>
            <Badge variant="approved" size="sm">
              Policy v{user.policyVersion}
            </Badge>
          </div>

          <div className="space-y-3 text-xs text-[var(--text-muted)] leading-relaxed">
            <div className="flex items-center justify-between">
              <span>Consent Record</span>
              <span className="font-mono text-[var(--text)] font-semibold">
                {user.consentAt
                  ? new Date(user.consentAt).toLocaleDateString()
                  : "Recorded at sign-up"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>Data Residency</span>
              <span className="font-semibold text-[var(--text)]">
                India / Asia-South (Sovereign)
              </span>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/privacy"
                target="_blank"
                className="text-xs font-bold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>Read Privacy Notice</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link
                href="/terms"
                target="_blank"
                className="text-xs font-bold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>Read Terms of Service</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </Card3D>

        {/* 3. Export My Data (Task 3) */}
        <Card3D className="p-5 space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border)]">
            <Download className="w-4 h-4 text-[var(--info)]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
              Data Portability
            </h2>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Under the Digital Personal Data Protection Act, you have the right
            to obtain a machine-readable export of all data associated with your
            account, including profile metadata, print job receipts, and audit
            logs.
          </p>

          <Button3D
            variant="outline"
            size="sm"
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Preparing JSON Export...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[var(--info)]" />
                <span>Export My Data (JSON)</span>
              </>
            )}
          </Button3D>
        </Card3D>

        {/* 4. Danger Zone: Delete My Account (Task 3) */}
        <Card3D className="p-5 border-2 border-red-500/30 bg-red-500/5 space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-red-500/20 text-red-600 dark:text-red-400">
            <Trash2 className="w-4 h-4" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider">
              Danger Zone: Delete Account
            </h2>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Deleting your account is permanent and irreversible. All vault
            documents and rendered page caches will be immediately deleted from
            cloud storage. Past merchant transaction receipts will be stripped
            of all personal linkages.
          </p>

          <Button3D
            variant="danger"
            size="sm"
            onClick={() => {
              setDeleteConfirmText("");
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
            className="text-xs font-bold"
          >
            Delete My Account
          </Button3D>
        </Card3D>
      </div>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeleting) setShowDeleteModal(false);
        }}
        title="Confirm Permanent Account Deletion"
        className="max-w-md"
      >
        <div className="space-y-4 p-2 text-xs">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 space-y-1">
            <p className="font-bold">Warning: This cannot be undone.</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              All private documents in your vault, page caches, active sessions,
              and profile records will be permanently erased.
            </p>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-[var(--text)] block">
              Type <span className="font-mono text-red-500">DELETE</span> to
              confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] font-mono text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {deleteError && (
            <p className="text-red-500 font-bold text-xs">{deleteError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button3D
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button3D>
            <Button3D
              variant="danger"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmText !== "DELETE"}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  <span>Deleting Everything...</span>
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button3D>
          </div>
        </div>
      </Modal>
    </CustomerShell>
  );
}
