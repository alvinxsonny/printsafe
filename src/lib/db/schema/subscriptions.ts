import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { shops } from "./shops";
import { plans } from "./plans";

export const shopSubscriptions = pgTable("shop_subscriptions", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  status: text("status")
    .$type<"trial" | "active" | "grace" | "expired">()
    .default("trial")
    .notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  paymentId: text("payment_id"),
});
