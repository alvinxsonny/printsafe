import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export interface ShopExtractionItem {
  value: unknown;
  source: "maps_url" | "nominatim" | "osm" | "user";
  confidence: "high" | "medium" | "low";
}

export interface ShopServices {
  bw: boolean;
  color: boolean;
  a3: boolean;
  duplex: boolean;
}

export const shops = pgTable(
  "shops",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<
        | "draft"
        | "pending_review"
        | "changes_requested"
        | "approved"
        | "rejected"
        | "suspended"
      >()
      .default("draft")
      .notNull(),
    name: text("name").notNull(),
    addressLine: text("address_line").notNull(),
    locality: text("locality"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    googleMapsUrl: text("google_maps_url"),
    googleFtid: text("google_ftid"),
    extraction: jsonb("extraction").$type<Record<string, ShopExtractionItem>>(),
    contactPhone: text("contact_phone"),
    showPhone: boolean("show_phone").default(false).notNull(),
    gstin: text("gstin"),
    storefrontPhotoKey: text("storefront_photo_key"),
    services: jsonb("services")
      .$type<ShopServices>()
      .default({ bw: true, color: true, a3: false, duplex: true })
      .notNull(),
    priceBwPaise: integer("price_bw_paise").default(200).notNull(), // ₹2.00
    priceColorPaise: integer("price_color_paise").default(1000).notNull(), // ₹10.00
    manualLive: boolean("manual_live").default(false).notNull(),
    scheduleEnabled: boolean("schedule_enabled").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (table) => [
    index("shops_status_idx").on(table.status),
    index("shops_owner_id_idx").on(table.ownerId),
  ]
);

export const shopHours = pgTable("shop_hours", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(), // 0 = Sunday, 6 = Saturday
  opens: text("opens").notNull(), // HH:mm
  closes: text("closes").notNull(), // HH:mm
});
