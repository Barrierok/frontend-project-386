"use client";

import type { MockBooking } from "@/components/prototype/mock-data";

export type { AdminScenario } from "@/components/prototype/scenarios";

export type EventTypeDraft = {
  id: string;
  name: string;
  description: string;
  duration: string;
};

export type EventTypeErrors = {
  id?: string;
  name?: string;
  description?: string;
};

export const emptyDraft: EventTypeDraft = {
  id: "",
  name: "",
  description: "",
  duration: "15",
};

export function validateDraft(draft: EventTypeDraft, existingIds: string[]): EventTypeErrors {
  const errors: EventTypeErrors = {};

  if (!/^[a-z0-9-]{3,}$/.test(draft.id)) {
    errors.id = "Слаг: строчные латинские буквы, цифры и дефис, минимум 3 символа.";
  } else if (existingIds.includes(draft.id)) {
    errors.id = "Такой слаг уже занят.";
  }

  if (draft.name.trim().length < 3) {
    errors.name = "Название — минимум 3 символа.";
  }

  if (draft.description.trim().length < 5) {
    errors.description = "Добавьте короткое описание для гостя.";
  }

  return errors;
}

export function groupByDay(bookings: MockBooking[]): { label: string; items: MockBooking[] }[] {
  const groups: { label: string; items: MockBooking[] }[] = [];

  for (const booking of bookings) {
    const label = `${booking.weekday}, ${booking.dayNumber} ${booking.month}`;
    const last = groups.at(-1);
    if (last?.label === label) {
      last.items.push(booking);
    } else {
      groups.push({ label, items: [booking] });
    }
  }

  return groups;
}
