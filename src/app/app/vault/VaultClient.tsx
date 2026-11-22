"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FolderLock,
  Upload,
  Clock,
  Trash2,
  Edit2,
  Printer,
  AlertCircle,
  Loader2,
  HardDrive,
  Eye,
  Sliders,
  Zap,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Card3D, Button3D, Badge, Modal, Input } from "@/components/ui";
import { openRazorpayCheckout } from "@/lib/payments/client";

interface VaultDocument {
  id: string;
  displayName: string;
  mime: string;
  sizeBytes: number;
  pageCount: number | null;
  status: "processing" | "ready" | "failed" | "deleted";
  defaultSettings?: {
    pages?: string;
    copies?: number;
    color?: boolean;
    duplex?: boolean;
    paper_size?: string;
  };
  deleteAfterPrint: boolean;
  expiresAt: string;
  createdAt: string;
}

interface VaultQuota {
  planName: string;
  usedUploads: number;
  maxUploads: number;
  usedBytes: number;
  maxBytes: number;
  usedMb: string;
  maxMb: number;
}

export function VaultClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [quota, setQuota] = useState<VaultQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Rename modal state
  const [renamingDoc, setRenamingDoc] = useState<VaultDocument | null>(null);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete modal state
  const [deletingDoc, setDeletingDoc] = useState<VaultDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({});

  async function loadVault() {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setQuota(data.quota || null);
      }
    } catch (err) {
      console.warn("Failed to load vault:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpgradePlus() {
    setIsUpgrading(true);
    setErrorMessage(null);
    try {
      const resOrder = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "customer_plan",
          refId: "customer_plus",
        }),
      });

      const orderData = await resOrder.json();
      if (!resOrder.ok) {
        throw new Error(orderData.error || "Failed to initiate Plus upgrade.");
      }

      await openRazorpayCheckout({
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || "INR",
        name: "PrintSafe Plus",
        description: "Customer Plus Plan Upgrade (₹49 / 30 Days)",
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const resVerify = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await resVerify.json();
            if (!resVerify.ok) {
              throw new Error(
                verifyData.error || "Payment verification failed."
              );
            }

            await loadVault();
          } catch (vErr) {
            setErrorMessage(
              vErr instanceof Error ? vErr.message : "Verification failed."
            );
          } finally {
            setIsUpgrading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsUpgrading(false);
          },
        },
        theme: {
          color: "#E5A93C",
        },
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upgrade failed.");
      setIsUpgrading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function fetchVault() {
      try {
        const res = await fetch("/api/documents");
        if (res.ok && !ignore) {
          const data = await res.json();
          setCurrentTime(Date.now());
          setDocuments(data.documents || []);
          setQuota(data.quota || null);
        }
      } catch (err) {
        console.warn("Failed to load vault:", err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    void fetchVault();
    return () => {
      ignore = true;
    };
  }, []);

  // Handle File Selection
  async function handleFileSelected(file: File) {
    setErrorMessage(null);

    // Reject DOCX and unsupported types with a friendly message
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "docx" || ext === "doc" || ext === "ppt" || ext === "pptx") {
      setErrorMessage(
        "Only PDF, JPG, PNG, and WebP files are supported. DOCX and Office support is coming soon."
      );
      return;
    }

    const validMimes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (
      !validMimes.includes(file.type) &&
      ext !== "pdf" &&
      ext !== "jpg" &&
      ext !== "png" &&
      ext !== "webp"
    ) {
      setErrorMessage(
        "Only PDF, JPG, PNG, and WebP files are supported. DOCX support is coming soon."
      );
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("File exceeds the maximum upload limit of 15 MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusText("Requesting encrypted vault slot...");

    try {
      // 1. Init upload
      const initRes = await fetch("/api/uploads/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mime: file.type || "application/pdf",
          sizeBytes: file.size,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.error || "Failed to initialize upload.");
      }

      const { documentId, uploadUrl } = initData;

      // 2. Direct upload to Cloudflare R2 with progress
      setUploadStatusText("Uploading directly to private vault...");
      setUploadProgress(40);

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("Failed to upload file content to vault storage.");
      }

      setUploadProgress(75);
      setUploadStatusText("Verifying file integrity & securing to vault...");

      // 3. Finalize upload
      const finalizeRes = await fetch("/api/uploads/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      const finalizeData = await finalizeRes.json();
      if (!finalizeRes.ok) {
        throw new Error(finalizeData.error || "Failed to process document.");
      }

      setUploadProgress(100);
      setUploadStatusText("Secured & Ready in Vault!");

      // Refresh documents
      await loadVault();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Document upload failed.";
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // Rename Document
  async function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!renamingDoc || !newDisplayName.trim()) return;

    setIsRenaming(true);
    try {
      const res = await fetch(`/api/documents/${renamingDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newDisplayName.trim() }),
      });

      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === renamingDoc.id
              ? { ...d, displayName: newDisplayName.trim() }
              : d
          )
        );
        setRenamingDoc(null);
      }
    } finally {
      setIsRenaming(false);
    }
  }

  // Hard Delete Document
  async function handleDeleteConfirm() {
    if (!deletingDoc) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deletingDoc.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
        setDeletingDoc(null);
        // Refresh quota
        loadVault();
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <CustomerShell userAlias="Customer Vault">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                Document Vault
              </h1>
              <Badge variant="live" size="sm">
                Private Vault
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Files are stored privately. Zero file access is ever granted to
              print shops until you share a secure one-time code.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button3D
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:inline-flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </Button3D>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* Quotas & Limits Overview Banner */}
        {quota && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card3D className="p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Subscription Tier
                  </span>
                  <div className="text-base font-extrabold text-[var(--text)]">
                    {quota.planName} Tier
                  </div>
                </div>
                <Badge
                  variant={quota.planName === "Plus" ? "live" : "neutral"}
                  size="sm"
                >
                  Active
                </Badge>
              </div>

              {quota.planName !== "Plus" && (
                <Button3D
                  variant="primary"
                  size="sm"
                  disabled={isUpgrading}
                  onClick={handleUpgradePlus}
                  className="w-full text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Upgrading...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Upgrade to Plus (₹49/mo)</span>
                    </>
                  )}
                </Button3D>
              )}
            </Card3D>

            <Card3D className="p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[11px]">
                  Monthly Uploads
                </span>
                <span className="font-bold font-mono">
                  {quota.usedUploads} / {quota.maxUploads}
                </span>
              </div>
              <div className="w-full h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (quota.usedUploads / quota.maxUploads) * 100
                    )}%`,
                  }}
                />
              </div>
            </Card3D>

            <Card3D className="p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5" />
                  Vault Storage
                </span>
                <span className="font-bold font-mono">
                  {quota.usedMb} MB / {quota.maxMb} MB
                </span>
              </div>
              <div className="w-full h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--info)] transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (quota.usedBytes / quota.maxBytes) * 100
                    )}%`,
                  }}
                />
              </div>
            </Card3D>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs font-semibold text-[var(--danger)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileSelected(file);
          }}
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className={`p-8 rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center select-none ${
            isDragOver
              ? "border-[var(--accent)] bg-[var(--accent-fill)]/10 scale-[1.01]"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
          }`}
        >
          {isUploading ? (
            <div className="w-full max-w-md space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text)]">
                <span>{uploadStatusText}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Securing your document to the private vault...
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mx-auto extrude-sm">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text)]">
                  Drop your documents here, or browse
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Supports PDF, JPG, PNG, and WebP (up to 15 MB)
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Badge variant="live" size="sm">
                  PDF
                </Badge>
                <Badge variant="neutral" size="sm">
                  JPG / PNG / WebP
                </Badge>
                <Badge variant="offline" size="sm">
                  DOCX Coming Soon
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Documents Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold tracking-tight">
              Stored Documents ({documents.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              <span className="text-xs text-[var(--text-muted)]">
                Loading your vault...
              </span>
            </div>
          ) : documents.length === 0 ? (
            <Card3D className="p-12 text-center space-y-3 border border-[var(--border)]">
              <FolderLock className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[var(--text)]">
                  Your Vault is Empty
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  Upload Aadhaar, college assignments, tickets, or reports. They
                  are encrypted with unique keys and kept ready for private
                  printing.
                </p>
              </div>
            </Card3D>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {documents.map((doc) => {
                const daysLeft = currentTime
                  ? Math.max(
                      0,
                      Math.ceil(
                        (new Date(doc.expiresAt).getTime() - currentTime) /
                          (1000 * 60 * 60 * 24)
                      )
                    )
                  : 30;

                return (
                  <Card3D
                    key={doc.id}
                    className="p-4 flex flex-col justify-between space-y-4 border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Document Page 1 Thumbnail */}
                      <Link
                        href={`/app/vault/${doc.id}`}
                        className="block relative rounded-xl overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] h-44 group cursor-pointer"
                      >
                        {!failedThumbnails[doc.id] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={`/api/documents/${doc.id}/pages/1`}
                            alt={doc.displayName}
                            loading="lazy"
                            onError={() =>
                              setFailedThumbnails((prev) => ({
                                ...prev,
                                [doc.id]: true,
                              }))
                            }
                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center gap-2 bg-[var(--surface-2)]">
                            <FolderLock className="w-9 h-9 text-[var(--accent)]" />
                            <span className="text-xs font-bold text-[var(--text)] truncate max-w-[150px]">
                              {doc.displayName}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              {doc.pageCount ? `${doc.pageCount} pages` : "PDF"}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                          <Eye className="w-4 h-4" />
                          View Pages & Presets
                        </div>
                      </Link>

                      {/* Document Info */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="text-sm font-bold text-[var(--text)] truncate max-w-[200px]"
                            title={doc.displayName}
                          >
                            {doc.displayName}
                          </h3>
                          <button
                            onClick={() => {
                              setRenamingDoc(doc);
                              setNewDisplayName(doc.displayName);
                            }}
                            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-muted)] font-mono">
                          <span>
                            {doc.pageCount
                              ? `${doc.pageCount} pages`
                              : "1 page"}
                          </span>
                          <span>&bull;</span>
                          <span>{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
                        </div>
                      </div>

                      {/* Expiry Pill */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {doc.deleteAfterPrint ? (
                            <span className="text-[var(--warm)] font-semibold">
                              Deletes on print
                            </span>
                          ) : (
                            <span>Expires in {daysLeft}d</span>
                          )}
                        </span>
                        <Link
                          href={`/app/vault/${doc.id}`}
                          className="text-[var(--accent)] hover:underline font-bold flex items-center gap-1"
                        >
                          <Sliders className="w-3 h-3" />
                          Presets
                        </Link>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                      <Button3D
                        variant="secondary"
                        size="sm"
                        onClick={() => setDeletingDoc(doc)}
                        className="text-[var(--danger)] hover:bg-[var(--danger-fill)]/10"
                        title="Delete from Vault"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button3D>

                      <Link
                        href={`/app/jobs/new?doc=${doc.id}`}
                        className="flex-1"
                      >
                        <Button3D
                          variant="primary"
                          size="sm"
                          className="w-full flex items-center justify-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Job
                        </Button3D>
                      </Link>
                    </div>
                  </Card3D>
                );
              })}
            </div>
          )}
        </div>

        {/* Rename Modal */}
        <Modal
          isOpen={Boolean(renamingDoc)}
          onClose={() => setRenamingDoc(null)}
          title="Rename Document"
        >
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                Display Name
              </label>
              <Input
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="e.g. Identity_Card_Front.pdf"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button3D
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRenamingDoc(null)}
              >
                Cancel
              </Button3D>
              <Button3D
                type="submit"
                variant="primary"
                size="sm"
                disabled={isRenaming || !newDisplayName.trim()}
              >
                {isRenaming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Save Name"
                )}
              </Button3D>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={Boolean(deletingDoc)}
          onClose={() => setDeletingDoc(null)}
          title="Permanently Delete Document"
        >
          <div className="space-y-4 text-xs">
            <p className="text-[var(--text)] leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong>{deletingDoc?.displayName}</strong>?
            </p>
            <div className="p-3.5 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-[var(--danger)] font-medium">
              This triggers a cryptographic hard delete: the original file and
              all rendered page images will be immediately wiped from the
              storage bucket.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button3D
                variant="secondary"
                size="sm"
                onClick={() => setDeletingDoc(null)}
              >
                Cancel
              </Button3D>
              <Button3D
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Confirm Hard Delete"
                )}
              </Button3D>
            </div>
          </div>
        </Modal>
      </div>
    </CustomerShell>
  );
}
