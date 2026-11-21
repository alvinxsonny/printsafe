import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    pageCount: integer("page_count"),
    storageKey: text("storage_key").notNull(),
    wrappedKey: text("wrapped_key").notNull(),
    status: text("status")
      .$type<"processing" | "ready" | "failed" | "deleted">()
      .default("processing")
      .notNull(),
    defaultSettings: jsonb("default_settings").$type<{
      pages?: string;
      copies?: number;
      color?: boolean;
      duplex?: boolean;
      paper_size?: string;
    }>(),
    deleteAfterPrint: boolean("delete_after_print").default(false).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("documents_owner_id_idx").on(table.ownerId)]
);

export const documentPages = pgTable("document_pages", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  pageNo: integer("page_no").notNull(),
  storageKey: text("storage_key").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
});
