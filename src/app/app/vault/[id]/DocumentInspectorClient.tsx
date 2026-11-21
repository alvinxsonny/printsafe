"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Printer,
  Sliders,
  ShieldCheck,
  Save,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Card3D, Button3D, Badge, Switch3D, Input } from "@/components/ui";

interface DocumentDetails {
  id: string;
  displayName: string;
  mime: string;
  sizeBytes: number;
  pageCount: number;
  status: string;
  defaultSettings?: {
    pages?: string;
    copies?: number;
    color?: boolean;
    duplex?: boolean;
    paper_size?: string;
  };
  deleteAfterPrint: boolean;
  expiresAt: string;
}

export function DocumentInspectorClient({
  documentId,
}: {
  documentId: string;
}) {
  const router = useRouter();

  const [doc, setDoc] = useState<DocumentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Print Presets State
  const [pageRange, setPageRange] = useState("all");
  const [copies, setCopies] = useState("1");
  const [color, setColor] = useState(false);
  const [duplex, setDuplex] = useState(true);
  const [paperSize, setPaperSize] = useState("A4");

  // Retention State
  const [deleteAfterPrint, setDeleteAfterPrint] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/documents/${documentId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) router.push("/login");
          throw new Error("Document not found");
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted && data.document) {
          const d: DocumentDetails = data.document;
          setDoc(d);
          if (d.defaultSettings) {
            setPageRange(d.defaultSettings.pages || "all");
            setCopies(String(d.defaultSettings.copies || 1));
            setColor(Boolean(d.defaultSettings.color));
            setDuplex(
              d.defaultSettings.duplex !== undefined
                ? d.defaultSettings.duplex
                : true
            );
            setPaperSize(d.defaultSettings.paper_size || "A4");
          }
          setDeleteAfterPrint(Boolean(d.deleteAfterPrint));
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load document");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [documentId, router]);

  // Handle Save Settings
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!doc) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultSettings: {
            pages: pageRange,
            copies: parseInt(copies, 10) || 1,
            color,
            duplex,
            paper_size: paperSize,
          },
          deleteAfterPrint,
          retentionDays,
        }),
      });

      if (!res.ok) throw new Error("Failed to save presets");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError("Failed to update document presets.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <CustomerShell userAlias="Document Viewer">
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-xs text-[var(--text-muted)] font-semibold">
            Decrypting document pages...
          </p>
        </div>
      </CustomerShell>
    );
  }

  if (!doc) {
    return (
      <CustomerShell userAlias="Document Viewer">
        <div className="max-w-xl mx-auto p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[var(--danger)] mx-auto" />
          <h2 className="text-base font-bold">Document Not Found</h2>
          <p className="text-xs text-[var(--text-muted)]">
            This document may have been deleted or expired from your vault.
          </p>
          <Link href="/app/vault">
            <Button3D variant="secondary" size="sm">
              Return to Vault
            </Button3D>
          </Link>
        </div>
      </CustomerShell>
    );
  }

  const pagesArray = Array.from(
    { length: doc.pageCount || 1 },
    (_, i) => i + 1
  );

  return (
    <CustomerShell userAlias="Document Viewer">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <Link
            href="/app/vault"
            className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Document Vault
          </Link>

          <Link href={`/app/jobs/new?doc=${doc.id}`}>
            <Button3D
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print this Document
            </Button3D>
          </Link>
        </div>

        {/* Document Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              {doc.displayName}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"} &bull;{" "}
              {(doc.sizeBytes / 1024).toFixed(0)} KB &bull; Encrypted
              AES-256-GCM
            </p>
          </div>
          <Badge variant="live" size="sm">
            Ready in Vault
          </Badge>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-xs text-[var(--danger)] font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-[#3DD68C]/20 border border-[#2EB673] text-xs text-[#12724A] dark:text-[#3DD68C] font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Document print presets and retention saved successfully.
          </div>
        )}

        {/* Two Column Content: Left Previews, Right Presets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Page Previews */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text)]">
                Rendered Page Previews ({doc.pageCount})
              </h2>
              <span className="text-[11px] text-[var(--text-muted)]">
                Rendered at 150 DPI &bull; WebP
              </span>
            </div>

            <div className="space-y-4">
              {pagesArray.map((pNum) => (
                <Card3D key={pNum} className="p-3 bg-[var(--surface-2)]">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                    <span>Page {pNum}</span>
                    <Badge variant="neutral" size="sm">
                      Owner View
                    </Badge>
                  </div>
                  <div className="flex justify-center bg-white rounded-lg p-2 shadow-inner min-h-[300px] items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/documents/${doc.id}/pages/${pNum}`}
                      alt={`Page ${pNum} preview`}
                      className="max-h-[600px] w-auto object-contain rounded shadow-sm border border-neutral-200"
                      loading="lazy"
                    />
                  </div>
                </Card3D>
              ))}
            </div>
          </div>

          {/* Right: Print Presets & Retention Settings */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-[var(--accent)]" />
              Print Presets & Retention
            </h2>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <Card3D className="p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text)]">
                    Page Range
                  </label>
                  <Input
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g. all, 1-3, 5"
                    className="text-xs"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Use &apos;all&apos; or comma-separated ranges (1-5, 8).
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text)]">
                      Copies
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={copies}
                      onChange={(e) => setCopies(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text)]">
                      Paper Size
                    </label>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      <option value="A4">A4 (Standard)</option>
                      <option value="A3">A3 (Large)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[var(--text)]">
                        Colour Print
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Off for Black &amp; White
                      </p>
                    </div>
                    <Switch3D
                      checked={color}
                      onCheckedChange={setColor}
                      labelOn="COLOR"
                      labelOff="B&W"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[var(--text)]">
                        Duplex (Two-Sided)
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Print on both sides of paper
                      </p>
                    </div>
                    <Switch3D
                      checked={duplex}
                      onCheckedChange={setDuplex}
                      labelOn="2-SIDED"
                      labelOff="1-SIDED"
                    />
                  </div>
                </div>
              </Card3D>

              {/* Retention & Privacy Settings */}
              <Card3D className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-xs font-bold text-[var(--text)]">
                    Retention Policy
                  </h3>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[var(--text)]">
                      Auto-delete after print
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Permanently wipes from vault once printed
                    </p>
                  </div>
                  <Switch3D
                    checked={deleteAfterPrint}
                    onCheckedChange={setDeleteAfterPrint}
                    labelOn="YES"
                    labelOff="NO"
                  />
                </div>

                <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                  <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    Vault Expiration
                  </label>
                  <select
                    value={retentionDays}
                    onChange={(e) =>
                      setRetentionDays(parseInt(e.target.value, 10))
                    }
                    className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <option value={7}>Keep for 7 days</option>
                    <option value={14}>Keep for 14 days</option>
                    <option value={30}>Keep for 30 days (Default)</option>
                    <option value={60}>Keep for 60 days</option>
                    <option value={90}>Keep for 90 days</option>
                  </select>
                </div>

                <Button3D
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Document Settings
                </Button3D>
              </Card3D>
            </form>
          </div>
        </div>
      </div>
    </CustomerShell>
  );
}
