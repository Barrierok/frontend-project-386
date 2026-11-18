"use client";

import { useMemo, useState } from "react";

import {
  buildDays,
  mockEventTypes,
  type DaySlots,
  type EventType,
} from "@/components/prototype/mock-data";
import type { BookingScenario } from "@/components/prototype/scenarios";

export type { BookingScenario } from "@/components/prototype/scenarios";

export type BookingPhase = "idle" | "conflict" | "success";

export type ChosenSlot = {
  dayIso: string;
  weekday: string;
  dayNumber: string;
  month: string;
  time: string;
};

export type Guest = {
  name: string;
  email: string;
};

export type GuestErrors = {
  name?: string;
  email?: string;
};

export function validateGuest(guest: Guest): GuestErrors {
  const errors: GuestErrors = {};

  if (guest.name.trim().length < 2) {
    errors.name = "Укажите имя — минимум 2 символа.";
  }

  const email = guest.email.trim();
  const at = email.indexOf("@");
  const hasValidEmail = at > 0 && email.lastIndexOf(".") > at + 1 && !email.endsWith(".");

  if (!hasValidEmail) {
    errors.email = "Введите email, например name@example.com.";
  }

  return errors;
}

export function useBookingDemo(today: string, scenario: BookingScenario) {
  const eventTypes = scenario === "empty-types" ? [] : mockEventTypes;
  const [selectedTypeId, setSelectedTypeId] = useState<string>(eventTypes[0]?.id ?? "");
  // Для демонстрации состояний «Конфликт» и «Успех» сразу показываем заполненную заявку.
  const [selectedSlot, setSelectedSlot] = useState<ChosenSlot | null>(() => {
    if (scenario !== "success") {
      return null;
    }
    const firstDay = buildDays(today, eventTypes[0]?.duration ?? 15)[0];
    const firstSlot = firstDay?.slots.find((slot) => slot.available);
    return firstDay && firstSlot
      ? {
          dayIso: firstDay.iso,
          weekday: firstDay.weekday,
          dayNumber: firstDay.dayNumber,
          month: firstDay.month,
          time: firstSlot.time,
        }
      : null;
  });
  const [phase, setPhase] = useState<BookingPhase>(
    scenario === "success" ? "success" : scenario === "conflict" ? "conflict" : "idle",
  );
  const [guest, setGuest] = useState<Guest>(
    scenario === "success" || scenario === "conflict"
      ? { name: "Анна Смирнова", email: "anna@example.com" }
      : { name: "", email: "" },
  );

  const selectedType: EventType | null = eventTypes.find(({ id }) => id === selectedTypeId) ?? null;

  const days: DaySlots[] = useMemo(
    () => buildDays(today, selectedType?.duration ?? 15, scenario === "empty-slots"),
    [today, selectedType?.duration, scenario],
  );

  function selectType(id: string) {
    setSelectedTypeId(id);
    setSelectedSlot(null);
    setPhase("idle");
  }

  function selectSlot(day: Omit<DaySlots, "slots">, time: string) {
    setSelectedSlot({
      dayIso: day.iso,
      weekday: day.weekday,
      dayNumber: day.dayNumber,
      month: day.month,
      time,
    });
    if (phase === "conflict") {
      setPhase("idle");
    }
  }

  function clearSlot() {
    setSelectedSlot(null);
    setPhase("idle");
  }

  function confirm(onInvalid: (errors: GuestErrors) => void): "invalid" | "conflict" | "success" {
    const errors = validateGuest(guest);
    if (Object.keys(errors).length > 0) {
      onInvalid(errors);
      return "invalid";
    }

    if (scenario === "conflict") {
      setSelectedSlot(null);
      setPhase("conflict");
      return "conflict";
    }

    setPhase("success");
    return "success";
  }

  function reset() {
    setSelectedSlot(null);
    setPhase("idle");
    setGuest({ name: "", email: "" });
  }

  return {
    eventTypes,
    selectedType,
    selectType,
    days,
    selectedSlot,
    selectSlot,
    clearSlot,
    guest,
    setGuest,
    phase,
    confirm,
    reset,
  };
}
