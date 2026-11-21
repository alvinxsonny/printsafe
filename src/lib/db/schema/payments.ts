import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  kind: text("kind")
    .$type<"job" | "merchant_plan" | "customer_plan">()
    .notNull(),
  refId: text("ref_id").notNull(),
  payerUserId: text("payer_user_id")
    .notNull()
    .references(() => users.id),
  amountPaise: integer("amount_paise").notNull(),
  status: text("status")
    .$type<"created" | "paid" | "failed" | "refunded">()
    .default("created")
    .notNull(),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
