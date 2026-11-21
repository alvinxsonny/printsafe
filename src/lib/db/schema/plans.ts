import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import type { PlanLimits } from "@/config/plans";

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  audience: text("audience").$type<"merchant" | "customer">().notNull(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  pricePaise: integer("price_paise").notNull(),
  periodDays: integer("period_days").notNull(),
  limits: jsonb("limits").$type<PlanLimits>().notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
