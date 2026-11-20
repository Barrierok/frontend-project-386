import type { NewBookingRow, NewEventTypeRow } from "@/db/schema";

export function buildEventType(overrides: Partial<NewEventTypeRow> = {}): NewEventTypeRow {
  return {
    id: "call-30",
    title: "Звонок на 30 минут",
    description: "Развёрнутый разговор по задаче.",
    durationMinutes: 30,
    ...overrides,
  };
}

export type BookingFixture = Omit<NewBookingRow, "id" | "createdAt">;

export function buildBooking(overrides: Partial<BookingFixture> = {}): BookingFixture {
  const startsAt = overrides.startsAt ?? new Date("2026-11-20T09:00:00.000Z");

  return {
    eventTypeId: "call-30",
    startsAt,
    endsAt: overrides.endsAt ?? new Date(startsAt.getTime() + 30 * 60_000),
    guestName: "Гость",
    guestEmail: "guest@example.com",
    ...overrides,
  };
}
