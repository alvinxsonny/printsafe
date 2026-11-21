import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { plans } from "./plans";

export const customerProfiles = pgTable("customer_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  planPeriodEnd: timestamp("plan_period_end", { withTimezone: true }),
  sheetsPrintedTotal: integer("sheets_printed_total").default(0).notNull(),
  notifyEnabled: boolean("notify_enabled").default(false).notNull(),
  notifyArea: jsonb("notify_area").$type<{
    lat: number;
    lng: number;
    radiusM: number;
  }>(),
});
