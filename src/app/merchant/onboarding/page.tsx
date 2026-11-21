"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  MapPin,
  FileText,
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Upload,
  ShieldCheck,
  Save,
} from "lucide-react";
import {
  Card3D,
  Button3D,
  Input,
  Switch3D,
  Badge,
  Stepper,
  Modal,
} from "@/components/ui";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LocationPickerMap } from "@/components/map";
import type { ShopServices, ShopExtractionItem } from "@/lib/db/schema/shops";

const STEPS = [
  { id: "link", label: "Google Link" },
  { id: "location", label: "Location" },
  { id: "pricing", label: "Services & Rates" },
  { id: "hours", label: "Hours" },
  { id: "details", label: "Storefront & Submit" },
];

const WEEKDAYS = [
  { day: 1, name: "Monday" },
  { day: 2, name: "Tuesday" },
  { day: 3, name: "Wednesday" },
  { day: 4, name: "Thursday" },
  { day: 5, name: "Friday" },
  { day: 6, name: "Saturday" },
  { day: 0, name: "Sunday" },
];

export default function MerchantOnboardingPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [extractError, setExtractError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<string | null>(null);

  // Proximity warning modal state
  const [proximityWarning, setProximityWarning] = useState<string | null>(null);

  // Form State
  const [shopId, setShopId] = useState<string | null>(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [googleFtid, setGoogleFtid] = useState<string | null>(null);
  const [extractionSources, setExtractionSources] = useState<
    Record<string, "maps_url" | "nominatim" | "osm" | "user">
  >({});

  // Step 2: Location
  const [name, setName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState(12.9716); // Default: Bengaluru
  const [longitude, setLongitude] = useState(77.5946);

  // Step 3: Services & Pricing
  const [services, setServices] = useState<ShopServices>({
    bw: true,
    color: true,
    a3: false,
    duplex: true,
  });
  const [priceBwRupees, setPriceBwRupees] = useState("2.00");
  const [priceColorRupees, setPriceColorRupees] = useState("10.00");

  // Step 4: Hours
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [hoursConfig, setHoursConfig] = useState<
    Record<number, { isOpen: boolean; opens: string; closes: string }>
  >({
    1: { isOpen: true, opens: "09:00", closes: "21:00" },
    2: { isOpen: true, opens: "09:00", closes: "21:00" },
    3: { isOpen: true, opens: "09:00", closes: "21:00" },
    4: { isOpen: true, opens: "09:00", closes: "21:00" },
    5: { isOpen: true, opens: "09:00", closes: "21:00" },
    6: { isOpen: true, opens: "09:00", closes: "20:00" },
    0: { isOpen: false, opens: "10:00", closes: "18:00" },
  });

  // Step 5: Contact, GSTIN, Storefront
  const [contactPhone, setContactPhone] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const [gstin, setGstin] = useState("");
  const [storefrontPhotoKey, setStorefrontPhotoKey] = useState<string | null>(
    null
  );
  const [storefrontPhotoPreview, setStorefrontPhotoPreview] = useState<
    string | null
  >(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Load existing draft
  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/merchant/shop");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/merchant/login");
            return;
          }
          throw new Error("Failed to load shop draft");
        }

        const data = await res.json();
        if (data.shop) {
          const s = data.shop;
          if (s.status === "pending_review") {
            router.push("/merchant/pending");
            return;
          }
          if (s.status === "approved") {
            router.push("/merchant");
            return;
          }

          if (s.status === "changes_requested" && data.lastReview?.notes) {
            setAdminNotes(data.lastReview.notes);
          }

          setShopId(s.id);
          setName(s.name || "");
          setAddressLine(s.addressLine || "");
          setLocality(s.locality || "");
          setCity(s.city || "");
          setStateVal(s.state || "");
          setPincode(s.pincode || "");
          if (s.latitude && s.longitude) {
            setLatitude(s.latitude);
            setLongitude(s.longitude);
          }
          if (s.googleMapsUrl) setGoogleMapsUrl(s.googleMapsUrl);
          if (s.googleFtid) setGoogleFtid(s.googleFtid);
          if (s.services) setServices(s.services);
          if (s.priceBwPaise)
            setPriceBwRupees((s.priceBwPaise / 100).toFixed(2));
          if (s.priceColorPaise)
            setPriceColorRupees((s.priceColorPaise / 100).toFixed(2));
          if (s.contactPhone) setContactPhone(s.contactPhone);
          setShowPhone(Boolean(s.showPhone));
          if (s.gstin) setGstin(s.gstin);
          if (s.storefrontPhotoKey) setStorefrontPhotoKey(s.storefrontPhotoKey);
          setScheduleEnabled(Boolean(s.scheduleEnabled));

          if (s.extraction) {
            const sources: Record<
              string,
              "maps_url" | "nominatim" | "osm" | "user"
            > = {};
            for (const [key, item] of Object.entries(
              s.extraction as Record<string, ShopExtractionItem>
            )) {
              if (item?.source) sources[key] = item.source;
            }
            setExtractionSources(sources);
          }

          // If hours exist
          if (Array.isArray(data.hours) && data.hours.length > 0) {
            setHoursConfig((prev) => {
              const newHours = { ...prev };
              for (const k of Object.keys(newHours)) {
                newHours[Number(k)].isOpen = false;
              }
              for (const h of data.hours) {
                newHours[h.weekday] = {
                  isOpen: true,
                  opens: h.opens,
                  closes: h.closes,
                };
              }
              return newHours;
            });
          }

          // If they already filled location, resume from Step 1 or 2
          if (s.name && s.addressLine) {
            setCurrentStep(1);
          }
        }
      } catch (err) {
        console.warn("Could not fetch shop draft:", err);
      } finally {
        setIsLoadingInitial(false);
      }
    }

    loadShop();
  }, [router]);

  // Handle Google Link Extraction
  async function handleExtractLink(e: React.FormEvent) {
    e.preventDefault();
    setExtractError(null);

    const url = googleMapsUrl.trim();
    if (!url) {
      setExtractError("Please paste a Google Maps link to extract.");
      return;
    }

    setIsExtracting(true);

    try {
      // 1. Resolve & parse Google Maps URL
      const resolveRes = await fetch("/api/maps/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const resolveData = await resolveRes.json();
      if (!resolveRes.ok) {
        throw new Error(
          resolveData.error ||
            "This link could not be read. Check that it is a Google Maps share link."
        );
      }

      const parsed = resolveData.parsed;
      const sources: Record<string, "maps_url" | "nominatim" | "osm" | "user"> =
        {};

      if (parsed.name) {
        setName(parsed.name);
        sources.name = "maps_url";
      }
      if (parsed.googleFtid) {
        setGoogleFtid(parsed.googleFtid);
        sources.googleFtid = "maps_url";
      }

      const lat = parsed.latitude;
      const lng = parsed.longitude;

      if (lat !== undefined && lng !== undefined) {
        setLatitude(lat);
        setLongitude(lng);
        sources.coordinates = "maps_url";

        // 2. Reverse geocode via Nominatim proxy
        try {
          const geoRes = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.addressLine) {
              setAddressLine(geoData.addressLine);
              sources.addressLine = "nominatim";
            }
            if (geoData.locality) {
              setLocality(geoData.locality);
              sources.locality = "nominatim";
            }
            if (geoData.city) {
              setCity(geoData.city);
              sources.city = "nominatim";
            }
            if (geoData.state) {
              setStateVal(geoData.state);
              sources.state = "nominatim";
            }
            if (geoData.pincode) {
              setPincode(geoData.pincode);
              sources.pincode = "nominatim";
            }

            // OSM enrichment
            if (geoData.osmEnrichment?.phone && !contactPhone) {
              setContactPhone(geoData.osmEnrichment.phone);
              sources.contactPhone = "osm";
            }
          }
        } catch (geoErr) {
          console.warn("Reverse geocode failed:", geoErr);
        }
      }

      setExtractionSources(sources);
      // Auto advance to Step 2 (Location)
      setCurrentStep(1);
      // Save draft in background
      await saveDraft({
        googleMapsUrl: url,
        googleFtid: parsed.googleFtid,
        name: parsed.name,
        latitude: lat,
        longitude: lng,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "This link could not be read. Check that it is a Google Maps share link.";
      setExtractError(msg);
    } finally {
      setIsExtracting(false);
    }
  }

  // Handle Map Pin Drag
  async function handlePositionChange(newLat: number, newLng: number) {
    setLatitude(newLat);
    setLongitude(newLng);
    setExtractionSources((prev) => ({ ...prev, coordinates: "user" }));

    // Auto update address from new pin if address is blank or user wants suggestions
    try {
      const res = await fetch(`/api/geo/reverse?lat=${newLat}&lng=${newLng}`);
      if (res.ok) {
        const data = await res.json();
        if (!addressLine && data.addressLine) {
          setAddressLine(data.addressLine);
          setExtractionSources((prev) => ({
            ...prev,
            addressLine: "nominatim",
          }));
        }
        if (!city && data.city) {
          setCity(data.city);
          setExtractionSources((prev) => ({ ...prev, city: "nominatim" }));
        }
        if (!stateVal && data.state) {
          setStateVal(data.state);
          setExtractionSources((prev) => ({ ...prev, state: "nominatim" }));
        }
        if (!pincode && data.pincode) {
          setPincode(data.pincode);
          setExtractionSources((prev) => ({
            ...prev,
            pincode: "nominatim",
          }));
        }
      }
    } catch {
      // ignore
    }
  }

  // Build hours array
  function getHoursArray() {
    const arr: { weekday: number; opens: string; closes: string }[] = [];
    for (const [wStr, config] of Object.entries(hoursConfig)) {
      if (config.isOpen) {
        arr.push({
          weekday: Number(wStr),
          opens: config.opens,
          closes: config.closes,
        });
      }
    }
    return arr;
  }

  // Build extraction object for database
  function getExtractionObject(): Record<string, ShopExtractionItem> {
    const ext: Record<string, ShopExtractionItem> = {};
    if (name) {
      ext.name = {
        value: name,
        source: extractionSources.name || "user",
        confidence: extractionSources.name === "maps_url" ? "high" : "medium",
      };
    }
    if (addressLine) {
      ext.addressLine = {
        value: addressLine,
        source: extractionSources.addressLine || "user",
        confidence:
          extractionSources.addressLine === "nominatim" ? "high" : "medium",
      };
    }
    if (city) {
      ext.city = {
        value: city,
        source: extractionSources.city || "user",
        confidence: extractionSources.city === "nominatim" ? "high" : "medium",
      };
    }
    if (stateVal) {
      ext.state = {
        value: stateVal,
        source: extractionSources.state || "user",
        confidence: extractionSources.state === "nominatim" ? "high" : "medium",
      };
    }
    if (pincode) {
      ext.pincode = {
        value: pincode,
        source: extractionSources.pincode || "user",
        confidence:
          extractionSources.pincode === "nominatim" ? "high" : "medium",
      };
    }
    return ext;
  }

  // Save Draft Helper
  async function saveDraft(extraData: Record<string, unknown> = {}) {
    setIsSavingDraft(true);
    try {
      const priceBwPaise = Math.round((parseFloat(priceBwRupees) || 2) * 100);
      const priceColorPaise = Math.round(
        (parseFloat(priceColorRupees) || 10) * 100
      );

      const payload = {
        id: shopId,
        name,
        addressLine,
        locality,
        city,
        state: stateVal,
        pincode,
        latitude,
        longitude,
        googleMapsUrl,
        googleFtid,
        extraction: getExtractionObject(),
        services,
        priceBwPaise,
        priceColorPaise,
        contactPhone,
        showPhone,
        gstin,
        storefrontPhotoKey,
        scheduleEnabled,
        hours: getHoursArray(),
        ...extraData,
      };

      const res = await fetch("/api/merchant/shop/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.shopId && !shopId) {
          setShopId(data.shopId);
        }
      }
    } catch (err) {
      console.warn("Could not autosave draft:", err);
    } finally {
      setIsSavingDraft(false);
    }
  }

  // Step Navigation
  async function goToNextStep() {
    if (currentStep === 1) {
      // Validate Step 2: Location
      if (!name.trim()) {
        setSubmitError("Shop name is required.");
        return;
      }
      if (
        !addressLine.trim() ||
        !city.trim() ||
        !stateVal.trim() ||
        !pincode.trim()
      ) {
        setSubmitError("Address line, city, state, and pincode are required.");
        return;
      }
      setSubmitError(null);
    }

    if (currentStep === 2) {
      // Validate Step 3: Pricing
      const bw = parseFloat(priceBwRupees);
      const color = parseFloat(priceColorRupees);
      if (isNaN(bw) || bw <= 0 || isNaN(color) || color <= 0) {
        setSubmitError("Please enter valid positive print prices.");
        return;
      }
      setSubmitError(null);
    }

    // Save progress after each step
    await saveDraft();
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function goToPreviousStep() {
    setSubmitError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  // Storefront Photo Upload
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Storefront photo must be under 5 MB.");
      return;
    }

    // Validate format
    const validMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!validMimes.includes(file.type)) {
      setSubmitError("Only JPG, PNG, or WebP images are allowed.");
      return;
    }

    setIsUploadingPhoto(true);
    setUploadProgress(10);
    setSubmitError(null);

    try {
      // 1. Get presigned PUT URL
      const presignRes = await fetch("/api/merchant/photo-presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          shopId: shopId || undefined,
        }),
      });

      if (!presignRes.ok) {
        throw new Error("Failed to prepare upload destination.");
      }

      const { uploadUrl, key } = await presignRes.json();
      setUploadProgress(50);

      // 2. Upload directly to Cloudflare R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image to storage.");
      }

      setUploadProgress(100);
      setStorefrontPhotoKey(key);
      setStorefrontPhotoPreview(URL.createObjectURL(file));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Image upload failed";
      setSubmitError(msg);
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(null);
    }
  }

  // Final Submit
  async function handleSubmit(confirmProximityOverride: boolean = false) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const priceBwPaise = Math.round((parseFloat(priceBwRupees) || 2) * 100);
      const priceColorPaise = Math.round(
        (parseFloat(priceColorRupees) || 10) * 100
      );

      const payload = {
        id: shopId,
        name: name.trim(),
        addressLine: addressLine.trim(),
        locality: locality.trim(),
        city: city.trim(),
        state: stateVal.trim(),
        pincode: pincode.trim(),
        latitude,
        longitude,
        googleMapsUrl: googleMapsUrl.trim() || null,
        googleFtid: googleFtid || null,
        extraction: getExtractionObject(),
        services,
        priceBwPaise,
        priceColorPaise,
        contactPhone: contactPhone.trim(),
        showPhone,
        gstin: gstin.trim() || null,
        storefrontPhotoKey,
        scheduleEnabled,
        hours: getHoursArray(),
        confirmProximity: confirmProximityOverride,
      };

      const res = await fetch("/api/merchant/shop/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.proximityWarning) {
          setProximityWarning(data.message);
          return;
        }
        throw new Error(data.error || "Failed to submit application");
      }

      // Application submitted -> Redirect to pending review screen
      router.push("/merchant/pending");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Submission failed. Please check inputs.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderSourceBadge(sourceKey: string) {
    const src = extractionSources[sourceKey];
    if (src === "maps_url") {
      return (
        <Badge variant="info" size="sm" className="ml-2">
          From link
        </Badge>
      );
    }
    if (src === "nominatim" || src === "osm") {
      return (
        <Badge variant="live" size="sm" className="ml-2">
          From map data
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" size="sm" className="ml-2">
        You entered
      </Badge>
    );
  }

  if (isLoadingInitial) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            Loading merchant workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-fill)] border border-[#2EB673] flex items-center justify-center text-[#14213D] extrude-sm font-black">
              PS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight">
                  PrintSafe Merchant
                </h1>
                <Badge variant="pending" size="sm">
                  Registration
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Zero-Trust Storefront Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button3D
              variant="secondary"
              size="sm"
              onClick={() => saveDraft()}
              disabled={isSavingDraft}
              className="hidden sm:inline-flex items-center gap-1.5"
            >
              {isSavingDraft ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Draft
            </Button3D>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        {/* Admin Changes Requested Alert Banner */}
        {adminNotes && (
          <div className="bg-[var(--warm-fill)]/15 border-2 border-[var(--warm)] rounded-2xl p-5 extrude-sm flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-[var(--warm)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[var(--text)]">
                Admin Review: Changes Requested
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {adminNotes}
              </p>
              <p className="text-[11px] text-[var(--warm)] font-medium mt-1">
                Please update the highlighted details below and re-submit for
                approval.
              </p>
            </div>
          </div>
        )}

        {/* Stepper Progress */}
        <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] extrude-sm">
          <Stepper steps={STEPS} currentStep={currentStep} />
        </div>

        {/* Global Error Banner */}
        {submitError && (
          <div className="p-4 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-[var(--danger)] text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {submitError}
          </div>
        )}

        {/* STEP 1: Google Maps Link */}
        {currentStep === 0 && (
          <Card3D className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[var(--accent)] text-xs font-bold uppercase tracking-wider">
                <Store className="w-4 h-4" />
                Step 1 of 5
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Import from Google Maps
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xl">
                Paste your shop&apos;s Google Maps link or share link. PrintSafe
                extracts your shop name and location coordinates directly from
                the link without scraping.
              </p>
            </div>

            <form onSubmit={handleExtractLink} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Google Maps URL or Share Link
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url"
                    placeholder="https://maps.app.goo.gl/... or https://google.com/maps/place/..."
                    value={googleMapsUrl}
                    onChange={(e) => {
                      setGoogleMapsUrl(e.target.value);
                      setExtractError(null);
                    }}
                    className="flex-1 h-12 px-4 rounded-2xl bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] shadow-inner text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <Button3D
                    type="submit"
                    variant="primary"
                    disabled={isExtracting || !googleMapsUrl.trim()}
                    className="shrink-0 h-12 px-6"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        Extract Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button3D>
                </div>
              </div>

              {extractError && (
                <div className="p-3.5 rounded-xl bg-[var(--danger-fill)]/15 border border-[var(--danger)] text-[var(--danger)] text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {extractError}
                </div>
              )}
            </form>

            <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-[var(--text-muted)]">
                Don&apos;t have a Google Maps link yet?
              </span>
              <Button3D
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentStep(1)}
              >
                Skip & Enter Manually
              </Button3D>
            </div>
          </Card3D>
        )}

        {/* STEP 2: Location & Address Confirmation */}
        {currentStep === 1 && (
          <Card3D className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[var(--accent)] text-xs font-bold uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                Step 2 of 5
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Storefront Location & Address
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Confirm your exact storefront location on the map. You can drag
                the pin to match your customer entrance.
              </p>
            </div>

            {/* Leaflet Map */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Map Pin Coordinates {renderSourceBadge("coordinates")}
                </label>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              </div>
              <LocationPickerMap
                latitude={latitude}
                longitude={longitude}
                onChange={handlePositionChange}
              />
            </div>

            {/* Address Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="md:col-span-2">
                <div className="flex items-center mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Shop / Trade Name *
                  </label>
                  {renderSourceBadge("name")}
                </div>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setExtractionSources((prev) => ({ ...prev, name: "user" }));
                  }}
                  placeholder="e.g. Apex Xerox & Digital Prints"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Street Address / Building *
                  </label>
                  {renderSourceBadge("addressLine")}
                </div>
                <Input
                  value={addressLine}
                  onChange={(e) => {
                    setAddressLine(e.target.value);
                    setExtractionSources((prev) => ({
                      ...prev,
                      addressLine: "user",
                    }));
                  }}
                  placeholder="e.g. Shop #4, Ground Floor, Krishna Complex, 5th Main"
                  required
                />
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Locality / Area
                  </label>
                  {renderSourceBadge("locality")}
                </div>
                <Input
                  value={locality}
                  onChange={(e) => {
                    setLocality(e.target.value);
                    setExtractionSources((prev) => ({
                      ...prev,
                      locality: "user",
                    }));
                  }}
                  placeholder="e.g. Koramangala 4th Block"
                />
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    City *
                  </label>
                  {renderSourceBadge("city")}
                </div>
                <Input
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setExtractionSources((prev) => ({ ...prev, city: "user" }));
                  }}
                  placeholder="e.g. Bengaluru"
                  required
                />
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    State *
                  </label>
                  {renderSourceBadge("state")}
                </div>
                <Input
                  value={stateVal}
                  onChange={(e) => {
                    setStateVal(e.target.value);
                    setExtractionSources((prev) => ({
                      ...prev,
                      state: "user",
                    }));
                  }}
                  placeholder="e.g. Karnataka"
                  required
                />
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Postal Code (Pincode) *
                  </label>
                  {renderSourceBadge("pincode")}
                </div>
                <Input
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    setExtractionSources((prev) => ({
                      ...prev,
                      pincode: "user",
                    }));
                  }}
                  placeholder="e.g. 560034"
                  required
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
              <Button3D
                type="button"
                variant="secondary"
                onClick={goToPreviousStep}
                className="flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button3D>
              <Button3D
                type="button"
                variant="primary"
                onClick={goToNextStep}
                className="flex items-center gap-1.5"
              >
                Next: Services & Rates
                <ArrowRight className="w-4 h-4" />
              </Button3D>
            </div>
          </Card3D>
        )}

        {/* STEP 3: Services & Pricing */}
        {currentStep === 2 && (
          <Card3D className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[var(--accent)] text-xs font-bold uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                Step 3 of 5
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Services & Per-Page Pricing
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Specify available print formats and per-page rates. Quotes are
                automatically calculated based on exact sheet count and side
                selection.
              </p>
            </div>

            {/* Services Available */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Supported Print Capabilities
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "bw", label: "B&W Print", desc: "Monochrome" },
                  { id: "color", label: "Colour Print", desc: "Full colour" },
                  { id: "duplex", label: "Duplex Printing", desc: "Two-sided" },
                  { id: "a3", label: "A3 Paper", desc: "Large format" },
                ].map((item) => {
                  const key = item.id as keyof ShopServices;
                  const active = services[key];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setServices((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-150 extrude-sm select-none ${
                        active
                          ? "bg-[var(--surface)] border-[var(--accent)] text-[var(--text)] ring-2 ring-[var(--accent)]/30"
                          : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{item.label}</span>
                        {active && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                        )}
                      </div>
                      <span className="text-[11px] opacity-75">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Per-Page Prices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                <label className="text-xs font-bold text-[var(--text)]">
                  Standard B&W Rate (₹ / page) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-[var(--text-muted)]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={priceBwRupees}
                    onChange={(e) => setPriceBwRupees(e.target.value)}
                    className="w-full h-11 pl-8 pr-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm font-bold text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Stored as integer paise (
                  {Math.round((parseFloat(priceBwRupees) || 0) * 100)} paise)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                <label className="text-xs font-bold text-[var(--text)]">
                  Standard Colour Rate (₹ / page) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-[var(--text-muted)]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={priceColorRupees}
                    onChange={(e) => setPriceColorRupees(e.target.value)}
                    className="w-full h-11 pl-8 pr-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm font-bold text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Stored as integer paise (
                  {Math.round((parseFloat(priceColorRupees) || 0) * 100)} paise)
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
              <Button3D
                type="button"
                variant="secondary"
                onClick={goToPreviousStep}
                className="flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button3D>
              <Button3D
                type="button"
                variant="primary"
                onClick={goToNextStep}
                className="flex items-center gap-1.5"
              >
                Next: Operating Hours
                <ArrowRight className="w-4 h-4" />
              </Button3D>
            </div>
          </Card3D>
        )}

        {/* STEP 4: Operating Hours */}
        {currentStep === 3 && (
          <Card3D className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[var(--accent)] text-xs font-bold uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                Step 4 of 5
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Operating Schedule
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Configure your weekly operating hours and choose whether your
                shop automatically reflects open/closed status on customer maps.
              </p>
            </div>

            {/* Schedule Follow Switch */}
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                  Follow Schedule Automatically
                </h4>
                <p className="text-xs text-[var(--text-muted)] max-w-md">
                  When enabled, your shop automatically opens and closes on
                  customer maps based on these registered hours.
                </p>
              </div>
              <Switch3D
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
                labelOn="AUTO"
                labelOff="MANUAL"
              />
            </div>

            {/* Weekday Table */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Weekly Operating Hours
              </label>
              <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)]">
                {WEEKDAYS.map((w) => {
                  const cfg = hoursConfig[w.day];
                  return (
                    <div
                      key={w.day}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 w-32">
                        <input
                          type="checkbox"
                          checked={cfg.isOpen}
                          onChange={(e) =>
                            setHoursConfig((prev) => ({
                              ...prev,
                              [w.day]: { ...cfg, isOpen: e.target.checked },
                            }))
                          }
                          className="w-4 h-4 accent-[var(--accent)] rounded cursor-pointer"
                        />
                        <span
                          className={`font-bold ${
                            cfg.isOpen
                              ? "text-[var(--text)]"
                              : "text-[var(--text-muted)] line-through"
                          }`}
                        >
                          {w.name}
                        </span>
                      </div>

                      {cfg.isOpen ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={cfg.opens}
                            onChange={(e) =>
                              setHoursConfig((prev) => ({
                                ...prev,
                                [w.day]: { ...cfg, opens: e.target.value },
                              }))
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-mono text-xs focus:ring-1 focus:ring-[var(--accent)]"
                          />
                          <span className="text-[var(--text-muted)]">to</span>
                          <input
                            type="time"
                            value={cfg.closes}
                            onChange={(e) =>
                              setHoursConfig((prev) => ({
                                ...prev,
                                [w.day]: { ...cfg, closes: e.target.value },
                              }))
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-mono text-xs focus:ring-1 focus:ring-[var(--accent)]"
                          />
                        </div>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Closed
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
              <Button3D
                type="button"
                variant="secondary"
                onClick={goToPreviousStep}
                className="flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button3D>
              <Button3D
                type="button"
                variant="primary"
                onClick={goToNextStep}
                className="flex items-center gap-1.5"
              >
                Next: Storefront & Verification
                <ArrowRight className="w-4 h-4" />
              </Button3D>
            </div>
          </Card3D>
        )}

        {/* STEP 5: Storefront Photo, Contact & Submit */}
        {currentStep === 4 && (
          <Card3D className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[var(--accent)] text-xs font-bold uppercase tracking-wider">
                <Camera className="w-4 h-4" />
                Step 5 of 5
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Storefront & Admin Verification
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Provide your contact phone, optional GSTIN, and an exterior
                storefront photo showing your signage for admin verification.
              </p>
            </div>

            {/* Contact Phone & Privacy Toggle */}
            <div className="p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Contact Phone Number *
                </label>
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-[var(--text)]">
                    Show Phone Number to Customers
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    By default, your phone is strictly private and only
                    accessible to PrintSafe admins for verification.
                  </p>
                </div>
                <Switch3D
                  checked={showPhone}
                  onCheckedChange={setShowPhone}
                  labelOn="SHOW"
                  labelOff="PRIVATE"
                />
              </div>
            </div>

            {/* Optional GSTIN */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                GSTIN (Optional, for tax invoices)
              </label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="29AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>

            {/* Storefront Photo Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Storefront Photo (Signage / Board)
              </label>

              {storefrontPhotoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] p-2 bg-[var(--surface-2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storefrontPhotoPreview}
                    alt="Storefront Preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="mt-2 flex items-center justify-between px-2">
                    <span className="text-xs font-medium text-[var(--accent)] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Storefront Photo Ready
                    </span>
                    <label className="text-xs font-bold text-[var(--text)] cursor-pointer hover:underline">
                      Replace photo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-2)]/50 cursor-pointer transition-all duration-200">
                  <Upload className="w-8 h-8 text-[var(--text-muted)] mb-2" />
                  <span className="text-xs font-bold text-[var(--text)]">
                    Click to upload exterior storefront photo
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] mt-1">
                    JPG, PNG, WebP up to 5 MB (Stored securely in private vault)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                    className="hidden"
                  />
                </label>
              )}

              {isUploadingPhoto && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-[var(--text-muted)] font-medium">
                    <span>Uploading photo directly to secure storage...</span>
                    <span>{uploadProgress || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-200"
                      style={{ width: `${uploadProgress || 10}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Privacy & Admin Review Disclosure */}
            <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--text)]">Review Promise:</strong>{" "}
                Submitting this application places your shop in{" "}
                <strong>pending_review</strong>. An admin checks your Google
                Maps pin and storefront. Once approved, you receive 30 days of
                the Growth plan free and can switch Live to accept print orders.
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
              <Button3D
                type="button"
                variant="secondary"
                onClick={goToPreviousStep}
                className="flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button3D>

              <Button3D
                type="button"
                variant="primary"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting || !contactPhone.trim()}
                className="flex items-center gap-1.5 px-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    Submit Application
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button3D>
            </div>
          </Card3D>
        )}
      </main>

      {/* Proximity Warning Confirmation Modal */}
      <Modal
        isOpen={Boolean(proximityWarning)}
        onClose={() => setProximityWarning(null)}
        title="Nearby Shop Notice"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--warm-fill)]/20 border border-[var(--warm)] flex items-start gap-3 text-xs text-[var(--text)]">
            <AlertCircle className="w-5 h-5 text-[var(--warm)] shrink-0 mt-0.5" />
            <p className="leading-relaxed">{proximityWarning}</p>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            If you operate an independent storefront or copy center at this
            address, you may proceed. Our verification team will cross-check the
            storefront photo.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button3D
              variant="secondary"
              size="sm"
              onClick={() => setProximityWarning(null)}
            >
              Cancel & Adjust Pin
            </Button3D>
            <Button3D
              variant="primary"
              size="sm"
              onClick={() => {
                setProximityWarning(null);
                handleSubmit(true);
              }}
            >
              Confirm & Submit
            </Button3D>
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-4 text-center text-xs text-[var(--text-muted)]">
        PrintSafe Zero-Trust Print Network &bull;{" "}
        <Link href="/privacy" className="underline hover:text-[var(--text)]">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
