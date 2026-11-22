"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  Layers,
  Phone,
  Clock,
  Store,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";
import { MerchantShell } from "@/components/layout/MerchantShell";
import { Card3D, Button3D, Switch3D, Input } from "@/components/ui";

interface ShopData {
  id: string;
  name: string;
  addressLine: string;
  locality: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  contactPhone: string | null;
  showPhone: boolean;
  gstin: string | null;
  status: string;
  manualLive: boolean;
  scheduleEnabled: boolean;
  priceBwPaise: number;
  priceColorPaise: number;
  services: {
    bw: boolean;
    color: boolean;
    a3: boolean;
    duplex: boolean;
  };
}

interface HourEntry {
  weekday: number;
  opens: string;
  closes: string;
  closed?: boolean;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function MerchantSettingsClient() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [hours, setHours] = useState<HourEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form fields
  const [priceBw, setPriceBw] = useState("2.00");
  const [priceColor, setPriceColor] = useState("10.00");
  const [services, setServices] = useState({
    bw: true,
    color: true,
    a3: false,
    duplex: true,
  });
  const [showPhone, setShowPhone] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  // Critical identity fields
  const [name, setName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstin, setGstin] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadShop() {
      try {
        const res = await fetch("/api/merchant/shop");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (data.shop) {
            setShop(data.shop);
            setPriceBw((data.shop.priceBwPaise / 100).toFixed(2));
            setPriceColor((data.shop.priceColorPaise / 100).toFixed(2));
            if (data.shop.services) setServices(data.shop.services);
            setShowPhone(data.shop.showPhone ?? false);
            setContactPhone(data.shop.contactPhone || "");
            setScheduleEnabled(data.shop.scheduleEnabled ?? false);

            setName(data.shop.name);
            setAddressLine(data.shop.addressLine);
            setLocality(data.shop.locality || "");
            setCity(data.shop.city);
            setState(data.shop.state);
            setPincode(data.shop.pincode);
            setGstin(data.shop.gstin || "");
          }

          // Build full 7-day schedule
          const rawHours: Array<{
            weekday: number;
            opens: string;
            closes: string;
          }> = data.hours || [];
          const weekList: HourEntry[] = [];
          for (let day = 0; day < 7; day++) {
            const found = rawHours.find((h) => h.weekday === day);
            if (found) {
              weekList.push({
                weekday: day,
                opens: found.opens,
                closes: found.closes,
                closed: false,
              });
            } else {
              weekList.push({
                weekday: day,
                opens: "09:00",
                closes: "21:00",
                closed: day === 0, // Sunday default closed
              });
            }
          }
          setHours(weekList);
        }
      } catch (err) {
        console.warn("Failed to load shop settings:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadShop();

    return () => {
      ignore = true;
    };
  }, []);

  function handleHourChange(
    weekday: number,
    field: "opens" | "closes" | "closed",
    value: string | boolean
  ) {
    setHours((prev) =>
      prev.map((h) => (h.weekday === weekday ? { ...h, [field]: value } : h))
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const bwPaise = Math.round(parseFloat(priceBw) * 100);
      const colorPaise = Math.round(parseFloat(priceColor) * 100);

      if (
        isNaN(bwPaise) ||
        bwPaise <= 0 ||
        isNaN(colorPaise) ||
        colorPaise <= 0
      ) {
        throw new Error("Please enter valid prices greater than ₹0.");
      }

      // 1. Update Shop Settings
      const shopRes = await fetch("/api/merchant/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceBwPaise: bwPaise,
          priceColorPaise: colorPaise,
          services,
          showPhone,
          contactPhone,
          scheduleEnabled,
          name,
          addressLine,
          locality,
          city,
          state,
          pincode,
          gstin,
        }),
      });

      const shopData = await shopRes.json();
      if (!shopRes.ok) {
        throw new Error(shopData.error || "Failed to update shop details.");
      }

      // 2. Update Shop Schedule Hours
      const activeHours = hours
        .filter((h) => !h.closed)
        .map((h) => ({
          weekday: h.weekday,
          opens: h.opens,
          closes: h.closes,
        }));

      const hoursRes = await fetch("/api/merchant/shop/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: activeHours }),
      });

      if (!hoursRes.ok) {
        const hoursData = await hoursRes.json();
        throw new Error(hoursData.error || "Failed to update schedule hours.");
      }

      setSaveSuccess(
        shopData.criticalChange
          ? "Settings saved! Because critical identity details were edited, your shop has been placed into Pending Review."
          : "Shop settings updated successfully."
      );
      if (shopData.shop) setShop(shopData.shop);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !shop) {
    return (
      <MerchantShell shopName="Shop Settings">
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-xs text-[var(--text-muted)] font-semibold">
            Loading shop configuration...
          </p>
        </div>
      </MerchantShell>
    );
  }

  return (
    <MerchantShell shopName={shop.name} isLiveInitial={shop.manualLive}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Shop Settings &amp; Rates
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Configure per-page pricing, capabilities, hours, and contact
              visibility.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-xl bg-[var(--accent-fill)]/20 border border-[var(--accent)] text-xs text-[var(--text)] font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
            {saveSuccess}
          </div>
        )}

        {saveError && (
          <div className="p-4 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-xs text-[var(--danger)] font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {saveError}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Pricing */}
          <Card3D className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <DollarSign className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                Per-Page Pricing (Rates)
              </h2>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              These prices determine the instant binding quote shown to
              customers when submitting orders.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text)]">
                  Black &amp; White Price per Page (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[var(--text-muted)]">
                    ₹
                  </span>
                  <Input
                    type="number"
                    step="0.50"
                    min="0.50"
                    value={priceBw}
                    onChange={(e) => setPriceBw(e.target.value)}
                    className="pl-7 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text)]">
                  Full Colour Price per Page (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[var(--text-muted)]">
                    ₹
                  </span>
                  <Input
                    type="number"
                    step="0.50"
                    min="1.00"
                    value={priceColor}
                    onChange={(e) => setPriceColor(e.target.value)}
                    className="pl-7 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </Card3D>

          {/* Section 2: Services & Capabilities */}
          <Card3D className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <Layers className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                Services &amp; Capabilities
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)]">
                <div>
                  <p className="text-xs font-bold text-[var(--text)]">
                    Black &amp; White Printing
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Standard monochrome documents
                  </p>
                </div>
                <Switch3D
                  checked={services.bw}
                  onCheckedChange={(v) => setServices({ ...services, bw: v })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)]">
                <div>
                  <p className="text-xs font-bold text-[var(--text)]">
                    Colour Printing
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Colour certificates, photos &amp; slides
                  </p>
                </div>
                <Switch3D
                  checked={services.color}
                  onCheckedChange={(v) =>
                    setServices({ ...services, color: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)]">
                <div>
                  <p className="text-xs font-bold text-[var(--text)]">
                    Duplex (Two-Sided)
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Double-sided print capability
                  </p>
                </div>
                <Switch3D
                  checked={services.duplex}
                  onCheckedChange={(v) =>
                    setServices({ ...services, duplex: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)]">
                <div>
                  <p className="text-xs font-bold text-[var(--text)]">
                    A3 Large Format
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    A3 drawings, posters &amp; blueprints
                  </p>
                </div>
                <Switch3D
                  checked={services.a3}
                  onCheckedChange={(v) => setServices({ ...services, a3: v })}
                />
              </div>
            </div>
          </Card3D>

          {/* Section 3: Schedule Settings */}
          <Card3D className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                  Operating Hours &amp; Schedule
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text)]">
                  Follow Schedule Automatically
                </span>
                <Switch3D
                  checked={scheduleEnabled}
                  onCheckedChange={setScheduleEnabled}
                />
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              When automatic schedule is ON, your shop goes LIVE during
              operating hours and turns OFFLINE outside them (subject to manual
              override).
            </p>

            <div className="space-y-2 pt-2">
              {hours.map((h) => (
                <div
                  key={h.weekday}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] text-xs gap-3"
                >
                  <span className="w-28 font-bold text-[var(--text)]">
                    {WEEKDAYS[h.weekday]}
                  </span>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(h.closed)}
                        onChange={(e) =>
                          handleHourChange(
                            h.weekday,
                            "closed",
                            e.target.checked
                          )
                        }
                        className="rounded border-[var(--border)] accent-[var(--accent)]"
                      />
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Closed
                      </span>
                    </label>

                    {!h.closed && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={h.opens}
                          onChange={(e) =>
                            handleHourChange(h.weekday, "opens", e.target.value)
                          }
                          className="h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono"
                        />
                        <span className="text-[11px] text-[var(--text-muted)]">
                          to
                        </span>
                        <input
                          type="time"
                          value={h.closes}
                          onChange={(e) =>
                            handleHourChange(
                              h.weekday,
                              "closes",
                              e.target.value
                            )
                          }
                          className="h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card3D>

          {/* Section 4: Contact & Phone Visibility */}
          <Card3D className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                  Contact Information
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text)]">
                  Show Phone on Map
                </span>
                <Switch3D checked={showPhone} onCheckedChange={setShowPhone} />
              </div>
            </div>

            <div className="space-y-1 max-w-sm">
              <label className="text-xs font-bold text-[var(--text)]">
                Shop Contact Phone
              </label>
              <Input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="text-xs font-mono"
              />
              <span className="text-[10px] text-[var(--text-muted)]">
                Only visible on customer map if &quot;Show Phone on Map&quot; is
                enabled.
              </span>
            </div>
          </Card3D>

          {/* Section 5: Identity & Location (Protected) */}
          <Card3D className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <Store className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                Shop Identity &amp; Physical Address
              </h2>
            </div>

            <div className="p-3 rounded-xl bg-[var(--warning-fill)]/15 border border-[var(--warning)] text-xs text-[var(--warning)] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                <strong>Security Notice:</strong> Modifying critical shop
                identity details (Shop Name, Street Address, City, State, or
                GSTIN) requires re-verification by a PrintSafe administrator and
                will temporarily set your shop to <em>Pending Review</em>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--text)]">
                  Shop Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text)]">
                  GSTIN (Optional)
                </label>
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="29AAAAA0000A1Z5"
                  className="text-xs font-mono uppercase"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-[var(--text)]">
                  Street Address
                </label>
                <Input
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text)]">Locality</label>
                <Input
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text)]">City</label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text)]">State</label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text)]">Pincode</label>
                <Input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </Card3D>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/merchant">
              <Button3D variant="secondary" size="md">
                Cancel
              </Button3D>
            </Link>

            <Button3D
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving}
              className="flex items-center gap-2 font-bold"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {isSaving ? "Saving Settings..." : "Save All Settings"}
              </span>
            </Button3D>
          </div>
        </form>
      </div>
    </MerchantShell>
  );
}
