import type { Booking, EventType } from "@/contract/schemas";
import type { BookingRow, EventTypeRow } from "@/db/schema";

import type { InsertedBookingRow } from "./booking-insert";

export function toEventType(row: EventTypeRow): EventType {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    durationMinutes: row.durationMinutes,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toBooking(row: InsertedBookingRow, eventType: EventTypeRow): Booking {
  return {
    id: row.id,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    createdAt: new Date(row.created_at).toISOString(),
    eventType: {
      id: eventType.id,
      title: eventType.title,
      durationMinutes: eventType.durationMinutes,
    },
  };
}

export function toBookingFromRow(row: BookingRow, eventType: EventTypeRow): Booking {
  return {
    id: row.id,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    guestName: row.guestName,
    guestEmail: row.guestEmail,
    createdAt: row.createdAt.toISOString(),
    eventType: {
      id: eventType.id,
      title: eventType.title,
      durationMinutes: eventType.durationMinutes,
    },
  };
}
