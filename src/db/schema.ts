import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const eventTypes = pgTable(
  "event_types",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    durationMinutes: integer("duration_minutes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("event_types_id_format", sql`${table.id} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("event_types_id_length", sql`char_length(${table.id}) between 1 and 64`),
    check("event_types_title_length", sql`char_length(btrim(${table.title})) between 1 and 100`),
    check("event_types_description_length", sql`char_length(${table.description}) <= 500`),
    check(
      "event_types_duration_range",
      sql`${table.durationMinutes} between 5 and 540 and ${table.durationMinutes} % 5 = 0`,
    ),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventTypeId: text("event_type_id")
      .notNull()
      .references(() => eventTypes.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("bookings_time_valid", sql`${table.endsAt} > ${table.startsAt}`),
    check(
      "bookings_guest_name_length",
      sql`char_length(btrim(${table.guestName})) between 1 and 100`,
    ),
    check(
      "bookings_guest_email_length",
      sql`char_length(btrim(${table.guestEmail})) between 3 and 254`,
    ),
    index("bookings_starts_at_idx").on(table.startsAt),
  ],
);

export type EventTypeRow = typeof eventTypes.$inferSelect;
export type NewEventTypeRow = typeof eventTypes.$inferInsert;
export type BookingRow = typeof bookings.$inferSelect;
export type NewBookingRow = typeof bookings.$inferInsert;
