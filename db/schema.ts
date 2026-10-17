import { sql } from "drizzle-orm";
import { check, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const fieldwiseRecords = sqliteTable(
  "fieldwise_records",
  {
    userId: text("user_id").notNull(),
    recordKey: text("record_key").notNull(),
    payloadJson: text("payload_json").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    primaryKey({ columns: [table.userId, table.recordKey] }),
    check(
      "fieldwise_records_record_key_check",
      sql`${table.recordKey} in ('fw-context', 'fw-plans', 'fw-tasks', 'fw-bills', 'fw-subscription')`,
    ),
  ],
);
