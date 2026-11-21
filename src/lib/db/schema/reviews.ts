import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { shops } from "./shops";
import { users } from "./auth";

export const shopReviews = pgTable("shop_reviews", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  adminId: text("admin_id")
    .notNull()
    .references(() => users.id),
  decision: text("decision")
    .$type<
      "approved" | "changes_requested" | "rejected" | "suspended" | "reinstated"
    >()
    .notNull(),
  notes: text("notes"),
  checklist: jsonb("checklist").$type<Record<string, boolean>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
