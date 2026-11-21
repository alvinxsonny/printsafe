import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { shops } from "./shops";
import { documents } from "./documents";

export interface PrintJobSettings {
  pages: string;
  copies: number;
  color: boolean;
  duplex: boolean;
  paper_size: string;
  orientation?: string;
}

export const printJobs = pgTable(
  "print_jobs",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => users.id),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id),
    mode: text("mode").$type<"near" | "far">().notNull(),
    status: text("status")
      .$type<
        | "requested"
        | "accepted"
        | "awaiting_payment"
        | "paid"
        | "unlocked"
        | "printed"
        | "completed"
        | "rejected"
        | "cancelled"
        | "expired"
      >()
      .default("requested")
      .notNull(),
    settings: jsonb("settings").$type<PrintJobSettings>().notNull(),
    sheets: integer("sheets").notNull(),
    quotePaise: integer("quote_paise").notNull(),
    codeEnc: text("code_enc"),
    codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }),
    codeAttempts: integer("code_attempts").default(0).notNull(),
    unlockedUntil: timestamp("unlocked_until", { withTimezone: true }),
    openCount: integer("open_count").default(0).notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    printedAt: timestamp("printed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("print_jobs_shop_id_status_idx").on(table.shopId, table.status),
    index("print_jobs_customer_id_idx").on(table.customerId),
  ]
);

export const viewLogs = pgTable("view_logs", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => printJobs.id, { onDelete: "cascade" }),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id),
  pageNo: integer("page_no").notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});
