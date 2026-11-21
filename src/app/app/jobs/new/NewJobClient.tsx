"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Printer,
  FileText,
  Store,
  ChevronLeft,
  CreditCard,
  Banknote,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Card3D, Button3D, Badge, Switch3D, Input } from "@/components/ui";
import { calculateJobQuote } from "@/lib/jobs/quote";
import { NEAR_DEFAULT_RADIUS_M } from "@/config/app";

interface DocumentOption {
  id: string;
  displayName: string;
  pageCount: number;
  sizeBytes: number;
  status: string;
  defaultSettings?: {
    pages?: string;
    copies?: number;
    color?: boolean;
    duplex?: boolean;
    paper_size?: string;
  };
}

interface ShopOption {
  id: string;
  name: string;
  addressLine: string;
  locality: string | null;
  city: string;
  priceBwPaise: number;
  priceColorPaise: number;
  distanceMeters?: number;
  isLive: boolean;
}

export function NewJobClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialShopId = searchParams.get("shop") || "";
  const initialDocId = searchParams.get("doc") || "";

  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId);
  const [selectedShopId, setSelectedShopId] = useState<string>(initialShopId);

  // Settings
  const [pageRange, setPageRange] = useState("all");
  const [copies, setCopies] = useState("1");
  const [color, setColor] = useState(false);
  const [duplex, setDuplex] = useState(true);
  const [paperSize, setPaperSize] = useState("A4");
  const [mode, setMode] = useState<"near" | "far">("near");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSelectDoc(doc: DocumentOption) {
    setSelectedDocId(doc.id);
    if (doc.defaultSettings) {
      if (doc.defaultSettings.pages) setPageRange(doc.defaultSettings.pages);
      if (doc.defaultSettings.copies)
        setCopies(String(doc.defaultSettings.copies));
      if (doc.defaultSettings.color !== undefined)
        setColor(doc.defaultSettings.color);
      if (doc.defaultSettings.duplex !== undefined)
        setDuplex(doc.defaultSettings.duplex);
      if (doc.defaultSettings.paper_size)
        setPaperSize(doc.defaultSettings.paper_size);
    }
  }

  function handleSelectShop(shop: ShopOption) {
    setSelectedShopId(shop.id);
    if (shop.distanceMeters !== undefined) {
      setMode(shop.distanceMeters <= NEAR_DEFAULT_RADIUS_M ? "near" : "far");
    }
  }

  // 1. Fetch available documents and shops
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [docsRes, shopsRes] = await Promise.all([
          fetch("/api/documents"),
          fetch("/api/shops/nearby?lat=12.9716&lng=77.5946&radius=10000"), // Default central query
        ]);

        if (!ignore && docsRes.ok) {
          const docsData = await docsRes.json();
          const readyDocs: DocumentOption[] = (docsData.documents || []).filter(
            (d: DocumentOption) => d.status === "ready"
          );
          setDocuments(readyDocs);

          const chosenDoc =
            (initialDocId &&
              readyDocs.find((d: DocumentOption) => d.id === initialDocId)) ||
            readyDocs[0];
          if (chosenDoc) {
            setSelectedDocId(chosenDoc.id);
            if (chosenDoc.defaultSettings) {
              if (chosenDoc.defaultSettings.pages)
                setPageRange(chosenDoc.defaultSettings.pages);
              if (chosenDoc.defaultSettings.copies)
                setCopies(String(chosenDoc.defaultSettings.copies));
              if (chosenDoc.defaultSettings.color !== undefined)
                setColor(chosenDoc.defaultSettings.color);
              if (chosenDoc.defaultSettings.duplex !== undefined)
                setDuplex(chosenDoc.defaultSettings.duplex);
              if (chosenDoc.defaultSettings.paper_size)
                setPaperSize(chosenDoc.defaultSettings.paper_size);
            }
          }
        }

        if (!ignore && shopsRes.ok) {
          const shopsData = await shopsRes.json();
          const liveShops: ShopOption[] = (shopsData.shops || []).filter(
            (s: ShopOption) => s.isLive
          );
          setShops(liveShops);

          const chosenShop =
            (initialShopId &&
              liveShops.find((s: ShopOption) => s.id === initialShopId)) ||
            liveShops[0];
          if (chosenShop) {
            setSelectedShopId(chosenShop.id);
            if (chosenShop.distanceMeters !== undefined) {
              setMode(
                chosenShop.distanceMeters <= NEAR_DEFAULT_RADIUS_M
                  ? "near"
                  : "far"
              );
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load request options:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [initialDocId, initialShopId]);

  const selectedShop = useMemo(
    () => shops.find((s) => s.id === selectedShopId),
    [shops, selectedShopId]
  );
  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedDocId),
    [documents, selectedDocId]
  );

  // 4. Client Quotation Calculation
  const quote = useMemo(() => {
    if (!selectedShop || !selectedDoc) return null;

    return calculateJobQuote({
      pageRange,
      totalDocumentPages: selectedDoc.pageCount || 1,
      copies: parseInt(copies, 10) || 1,
      duplex,
      color,
      priceBwPaise: selectedShop.priceBwPaise,
      priceColorPaise: selectedShop.priceColorPaise,
    });
  }, [selectedShop, selectedDoc, pageRange, copies, duplex, color]);

  // 5. Handle Submit Print Request
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedShopId || !selectedDocId) {
      setErrorMessage("Please select both a document and a print shop.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShopId,
          documentId: selectedDocId,
          mode,
          settings: {
            pages: pageRange,
            copies: parseInt(copies, 10) || 1,
            color,
            duplex,
            paper_size: paperSize,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit print request.");
      }

      router.push(`/app/jobs/${data.jobId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create job";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <CustomerShell userAlias="Print Order">
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-xs text-[var(--text-muted)] font-semibold">
            Loading order configuration...
          </p>
        </div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell userAlias="Print Order">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <Link
            href="/app"
            className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Map
          </Link>
          <Badge variant="live" size="sm">
            Zero-Trust Print Request
          </Badge>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Configure Print Request
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Choose a document, confirm options, and receive an instant binding
            quote.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs text-[var(--danger)] font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Select Document from Vault */}
            <Card3D className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                    1. Select Document
                  </h2>
                </div>
                <Link
                  href="/app/vault"
                  className="text-[11px] font-bold text-[var(--accent)] hover:underline"
                >
                  Vault (+Upload)
                </Link>
              </div>

              {documents.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-[var(--border)] text-center space-y-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    No ready documents found in your vault.
                  </p>
                  <Link href="/app/vault">
                    <Button3D variant="primary" size="sm">
                      Upload Document to Vault
                    </Button3D>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {documents.map((doc) => {
                    const isSelected = selectedDocId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--surface-2)] shadow-xs"
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold text-[var(--text)] truncate">
                            {doc.displayName}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                            {doc.pageCount}{" "}
                            {doc.pageCount === 1 ? "page" : "pages"} &bull;{" "}
                            {(doc.sizeBytes / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card3D>

            {/* Step 2: Select Print Shop */}
            <Card3D className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                    2. Select Print Shop
                  </h2>
                </div>
                <Link
                  href="/app"
                  className="text-[11px] font-bold text-[var(--accent)] hover:underline"
                >
                  View on Map
                </Link>
              </div>

              {shops.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-[var(--border)] text-center space-y-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    No live print shops found nearby.
                  </p>
                  <Link href="/app">
                    <Button3D variant="secondary" size="sm">
                      Locate Live Shops
                    </Button3D>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {shops.map((shop) => {
                    const isSelected = selectedShopId === shop.id;
                    return (
                      <div
                        key={shop.id}
                        onClick={() => handleSelectShop(shop)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--surface-2)] shadow-xs"
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold text-[var(--text)] truncate">
                            {shop.name}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                            {shop.locality || shop.city} &bull; B&amp;W: ₹
                            {(shop.priceBwPaise / 100).toFixed(2)} &bull; Col: ₹
                            {(shop.priceColorPaise / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {shop.distanceMeters && (
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              {shop.distanceMeters < 1000
                                ? `${Math.round(shop.distanceMeters)}m`
                                : `${(shop.distanceMeters / 1000).toFixed(1)}km`}
                            </span>
                          )}
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card3D>
          </div>

          {/* Step 3: Print Settings & Mode */}
          <Card3D className="p-6 space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <Sliders className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                3. Print Options
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  &apos;all&apos; or comma-separated ranges
                </span>
              </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)]">
                <div>
                  <p className="text-xs font-bold text-[var(--text)]">
                    Colour Print
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {color
                      ? "Color printing enabled"
                      : "Standard Black & White"}
                  </p>
                </div>
                <Switch3D
                  checked={color}
                  onCheckedChange={setColor}
                  labelOn="COLOR"
                  labelOff="B&W"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)]">
                <div>
                  <p className="text-xs font-bold text-[var(--text)]">
                    Duplex (Two-Sided)
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {duplex ? "Prints on both sides" : "Single-sided print"}
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

            {/* Mode Selection */}
            <div className="pt-3 border-t border-[var(--border)] space-y-3">
              <label className="text-xs font-bold text-[var(--text)] block">
                Pickup &amp; Payment Mode
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setMode("near")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    mode === "near"
                      ? "border-[var(--accent)] bg-[var(--surface-2)] shadow-xs"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[var(--accent-fill)]/20 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-[var(--text)]">
                        Walk-in (Near Mode)
                      </p>
                      {selectedShop?.distanceMeters !== undefined &&
                        selectedShop.distanceMeters <=
                          NEAR_DEFAULT_RADIUS_M && (
                          <Badge variant="live" size="sm">
                            Suggested
                          </Badge>
                        )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      Pay cash at shop. Handover code unlocks viewer only when
                      you are physically present at the counter.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setMode("far")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    mode === "far"
                      ? "border-[var(--info)] bg-[var(--surface-2)] shadow-xs"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--info)]/40"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[var(--info-fill)]/20 border border-[var(--info)] flex items-center justify-center text-[var(--info)] shrink-0 mt-0.5">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-[var(--text)]">
                        Pay &amp; Collect (Far Mode)
                      </p>
                      {selectedShop?.distanceMeters !== undefined &&
                        selectedShop.distanceMeters > NEAR_DEFAULT_RADIUS_M && (
                          <Badge variant="info" size="sm">
                            Suggested
                          </Badge>
                        )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      Pay online in advance. Shop prints your job in queue so it
                      is ready waiting for you to collect.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card3D>

          {/* Quotation & Submit Card */}
          {quote && (
            <Card3D className="p-6 bg-[var(--surface-2)] border-2 border-[var(--accent)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Binding Quotation
                  </span>
                  <div className="text-2xl font-black font-mono text-[var(--text)]">
                    ₹{(quote.quotePaise / 100).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      Pages
                    </span>
                    <span className="font-bold">{quote.pagesCount} pages</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      Total Sheets
                    </span>
                    <span className="font-bold">{quote.sheets} sheets</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      Rate
                    </span>
                    <span className="font-bold">
                      ₹{(quote.perPagePricePaise / 100).toFixed(2)} / page
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] text-[var(--text-muted)]">
                  Zero file access is granted until unlocked. Shop receives
                  per-page watermarked view only.
                </p>

                <Button3D
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || !selectedShopId || !selectedDocId}
                  className="flex items-center gap-2 font-bold shrink-0"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  {isSubmitting ? "Sending Request..." : "Send Print Request"}
                </Button3D>
              </div>
            </Card3D>
          )}
        </form>
      </div>
    </CustomerShell>
  );
}
