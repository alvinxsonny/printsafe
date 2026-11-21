import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { shops, shopHours, shopReviews } from "@/lib/db/schema";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card3D, Badge } from "@/components/ui";
import { ShopReviewMap } from "@/components/map";
import { ReviewActions } from "./ReviewActions";
import { presignGet } from "@/lib/storage";
import { checkShopDuplicates } from "@/lib/shops/duplicate";
import type { ShopExtractionItem, ShopServices } from "@/lib/db/schema/shops";
import {
  Store,
  Clock,
  Phone,
  FileText,
  Camera,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ShieldAlert,
} from "lucide-react";

export const instant = false;

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default async function MerchantReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const { id: shopId } = await params;

  // 1. Fetch shop
  const shopRows = await db
    .select()
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  if (shopRows.length === 0) {
    notFound();
  }

  const shop = shopRows[0];
  const isSelfOwner = shop.ownerId === session.user.id;

  // 2. Fetch hours and past reviews
  const hours = await db
    .select()
    .from(shopHours)
    .where(eq(shopHours.shopId, shopId));

  const pastReviews = await db
    .select()
    .from(shopReviews)
    .where(eq(shopReviews.shopId, shopId))
    .orderBy(desc(shopReviews.createdAt));

  // 3. Generate presigned GET URL for storefront photo
  let photoUrl: string | null = null;
  if (shop.storefrontPhotoKey) {
    try {
      photoUrl = await presignGet(shop.storefrontPhotoKey, 900); // 15 mins
    } catch (photoErr) {
      console.warn("Could not presign photo:", photoErr);
    }
  }

  // 4. Compute Automatic Flags
  // Flag 1: Missing phone
  const flagMissingPhone = !shop.contactPhone || !shop.contactPhone.trim();

  // Flag 2: No storefront photo
  const flagNoPhoto = !shop.storefrontPhotoKey;

  // Flag 3: Duplicate or Proximity check
  const dupCheck = await checkShopDuplicates(
    shop.id,
    shop.googleFtid,
    shop.latitude,
    shop.longitude
  );
  const flagDuplicate =
    dupCheck.isDuplicate || Boolean(dupCheck.proximityWarning);

  // Flag 4: Pin vs geocoded address distance (> 300m)
  // Check if extraction recorded a high coordinate discrepancy
  let flagPinDistance = false;
  let pinDistanceMeters: number | null = null;
  if (shop.extraction && typeof shop.extraction === "object") {
    const ext = shop.extraction as Record<string, ShopExtractionItem>;
    if (ext.pinDistance && typeof ext.pinDistance.value === "number") {
      pinDistanceMeters = ext.pinDistance.value;
      if (pinDistanceMeters > 300) {
        flagPinDistance = true;
      }
    }
  }

  // Cast services
  const services = (shop.services || {
    bw: true,
    color: true,
    a3: false,
    duplex: true,
  }) as ShopServices;

  function renderSourceBadge(sourceKey: string) {
    const ext = (shop.extraction || {}) as Record<string, ShopExtractionItem>;
    const item = ext[sourceKey];
    if (!item)
      return (
        <Badge variant="neutral" size="sm">
          You entered
        </Badge>
      );

    if (item.source === "maps_url") {
      return (
        <Badge variant="info" size="sm">
          From link
        </Badge>
      );
    }
    if (item.source === "nominatim" || item.source === "osm") {
      return (
        <Badge variant="live" size="sm">
          From map data
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" size="sm">
        You entered
      </Badge>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <Link
            href="/admin/merchants"
            className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Merchants Queue
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] font-mono">
              Status:
            </span>
            <Badge
              variant={
                shop.status === "approved"
                  ? "approved"
                  : shop.status === "pending_review"
                    ? "pending"
                    : "rejected"
              }
            >
              {shop.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Storefront Overview Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {shop.name}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {shop.addressLine}, {shop.city}, {shop.state} - {shop.pincode}
            </p>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            Submitted: {new Date(shop.createdAt).toLocaleString()}
          </div>
        </div>

        {/* Two-Column Review Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT COLUMN: What Merchant Submitted */}
          <div className="space-y-5">
            {/* Storefront Photo */}
            <Card3D className="p-5 space-y-3 border border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  Storefront Signage Photo
                </span>
                {photoUrl ? (
                  <Badge variant="live" size="sm">
                    Verified Upload
                  </Badge>
                ) : (
                  <Badge variant="rejected" size="sm">
                    No Photo
                  </Badge>
                )}
              </div>

              {photoUrl ? (
                <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={`${shop.name} Storefront`}
                    className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-[var(--surface-2)] text-center text-xs text-[var(--text-muted)]">
                  The merchant did not upload an exterior storefront photo.
                </div>
              )}
            </Card3D>

            {/* Shop Details & Rates */}
            <Card3D className="p-5 space-y-4 border border-[var(--border)] text-xs">
              <h3 className="font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Store className="w-4 h-4 text-[var(--accent)]" />
                Submitted Business Profile
              </h3>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-[var(--surface-2)] space-y-1">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">
                    B&W Rate
                  </span>
                  <div className="text-base font-extrabold text-[var(--text)] font-mono">
                    ₹{(shop.priceBwPaise / 100).toFixed(2)}{" "}
                    <span className="text-xs font-normal">/ page</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-2)] space-y-1">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">
                    Colour Rate
                  </span>
                  <div className="text-base font-extrabold text-[var(--text)] font-mono">
                    ₹{(shop.priceColorPaise / 100).toFixed(2)}{" "}
                    <span className="text-xs font-normal">/ page</span>
                  </div>
                </div>
              </div>

              {/* Supported Services */}
              <div className="space-y-1.5 pt-2">
                <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[11px]">
                  Capabilities
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant={services.bw ? "approved" : "neutral"}
                    size="sm"
                  >
                    B&W: {services.bw ? "YES" : "NO"}
                  </Badge>
                  <Badge
                    variant={services.color ? "approved" : "neutral"}
                    size="sm"
                  >
                    Colour: {services.color ? "YES" : "NO"}
                  </Badge>
                  <Badge
                    variant={services.duplex ? "approved" : "neutral"}
                    size="sm"
                  >
                    Duplex: {services.duplex ? "YES" : "NO"}
                  </Badge>
                  <Badge
                    variant={services.a3 ? "approved" : "neutral"}
                    size="sm"
                  >
                    A3 Paper: {services.a3 ? "YES" : "NO"}
                  </Badge>
                </div>
              </div>

              {/* Contact & GSTIN */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--text-muted)] font-semibold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    Contact Phone:
                  </span>
                  <span className="font-bold font-mono text-[var(--text)]">
                    {shop.contactPhone || "None"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--text-muted)] font-semibold">
                    GSTIN:
                  </span>
                  <span className="font-mono text-[var(--text)]">
                    {shop.gstin || "Not provided (unregistered)"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--text-muted)] font-semibold">
                    Customer Visibility:
                  </span>
                  <Badge
                    variant={shop.showPhone ? "live" : "neutral"}
                    size="sm"
                  >
                    {shop.showPhone ? "Public" : "Private"}
                  </Badge>
                </div>
              </div>
            </Card3D>

            {/* Operating Schedule */}
            <Card3D className="p-5 space-y-3 border border-[var(--border)] text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[var(--accent)]" />
                  Operating Hours
                </h3>
                <Badge
                  variant={shop.scheduleEnabled ? "live" : "neutral"}
                  size="sm"
                >
                  {shop.scheduleEnabled ? "Auto-Scheduled" : "Manual Live"}
                </Badge>
              </div>

              <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]">
                {WEEKDAY_NAMES.map((name, idx) => {
                  const match = hours.find((h) => h.weekday === idx);
                  return (
                    <div
                      key={idx}
                      className="px-3.5 py-2 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-[var(--text)]">
                        {name}
                      </span>
                      {match ? (
                        <span className="font-mono font-bold text-[var(--text)]">
                          {match.opens} - {match.closes}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card3D>
          </div>

          {/* RIGHT COLUMN: Map, Extraction Report & Verification Actions */}
          <div className="space-y-5">
            {/* Map with Pin & Open in Google Maps Link */}
            <Card3D className="p-5 space-y-3 border border-[var(--border)]">
              {shop.latitude !== null && shop.longitude !== null ? (
                <ShopReviewMap
                  latitude={shop.latitude}
                  longitude={shop.longitude}
                  shopName={shop.name}
                />
              ) : (
                <div className="p-8 text-center text-xs text-[var(--danger)]">
                  Coordinates missing for this shop.
                </div>
              )}
            </Card3D>

            {/* Automatic Flags Card */}
            <Card3D className="p-5 space-y-3 border border-[var(--border)] text-xs">
              <h3 className="font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[var(--warm)]" />
                Automatic Risk Flags
              </h3>

              <div className="space-y-2">
                {/* Flag 1: Distance > 300m */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    flagPinDistance
                      ? "bg-[var(--danger-fill)]/15 border-[var(--danger)] text-[var(--danger)] font-bold"
                      : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  <span>Pin vs geocoded address distance &gt; 300m</span>
                  {flagPinDistance ? (
                    <XCircle className="w-4 h-4 shrink-0 text-[var(--danger)]" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--accent)]" />
                  )}
                </div>

                {/* Flag 2: Duplicate check */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    flagDuplicate
                      ? "bg-[var(--danger-fill)]/15 border-[var(--danger)] text-[var(--danger)] font-bold"
                      : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  <span>
                    Duplicate check (Feature ID & 30m proximity)
                    {dupCheck.proximityWarning && (
                      <span className="block text-[11px] font-normal">
                        Near &ldquo;{dupCheck.nearbyShopName}&rdquo; (
                        {dupCheck.nearbyDistanceM}m away)
                      </span>
                    )}
                  </span>
                  {flagDuplicate ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--warm)]" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--accent)]" />
                  )}
                </div>

                {/* Flag 3: Missing phone */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    flagMissingPhone
                      ? "bg-[var(--danger-fill)]/15 border-[var(--danger)] text-[var(--danger)] font-bold"
                      : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  <span>Merchant contact phone verification</span>
                  {flagMissingPhone ? (
                    <XCircle className="w-4 h-4 shrink-0 text-[var(--danger)]" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--accent)]" />
                  )}
                </div>

                {/* Flag 4: No storefront photo */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    flagNoPhoto
                      ? "bg-[var(--danger-fill)]/15 border-[var(--danger)] text-[var(--danger)] font-bold"
                      : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  <span>Storefront signage photo provided</span>
                  {flagNoPhoto ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--warm)]" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--accent)]" />
                  )}
                </div>
              </div>
            </Card3D>

            {/* Extraction Report Card */}
            <Card3D className="p-5 space-y-3 border border-[var(--border)] text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[var(--accent)]" />
                  Extraction Provenance Report
                </h3>
                {shop.googleFtid && (
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    ftid: {shop.googleFtid.slice(0, 16)}...
                  </span>
                )}
              </div>

              <div className="space-y-2 bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-between py-1">
                  <span className="text-[var(--text-muted)]">Shop Name:</span>
                  <div>{renderSourceBadge("name")}</div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[var(--text-muted)]">
                    Map Coordinates:
                  </span>
                  <div>{renderSourceBadge("coordinates")}</div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[var(--text-muted)]">
                    Street Address:
                  </span>
                  <div>{renderSourceBadge("addressLine")}</div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[var(--text-muted)]">
                    City & Locality:
                  </span>
                  <div>{renderSourceBadge("city")}</div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[var(--text-muted)]">
                    State & Pincode:
                  </span>
                  <div>{renderSourceBadge("pincode")}</div>
                </div>
              </div>
            </Card3D>

            {/* Interactive Decision & Checklist Component */}
            <ReviewActions
              shopId={shop.id}
              shopStatus={shop.status}
              isSelfOwner={isSelfOwner}
            />

            {/* Past Review History */}
            {pastReviews.length > 0 && (
              <Card3D className="p-5 space-y-3 border border-[var(--border)] text-xs">
                <h4 className="font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Review Audit Trail ({pastReviews.length})
                </h4>
                <div className="space-y-2">
                  {pastReviews.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            r.decision === "approved"
                              ? "approved"
                              : r.decision === "rejected" ||
                                  r.decision === "suspended"
                                ? "rejected"
                                : "pending"
                          }
                          size="sm"
                        >
                          {r.decision.toUpperCase()}
                        </Badge>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {r.notes && (
                        <p className="text-[var(--text)] mt-1">{r.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card3D>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
