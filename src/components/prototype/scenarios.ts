// ПРОТОТИП: списки вариантов и состояний. Обычный модуль без "use client",
// чтобы ключи можно было проверять в серверных страницах.

export type BookingScenario = "default" | "empty-types" | "empty-slots" | "conflict" | "success";

export const bookingScenarios: { key: BookingScenario; label: string }[] = [
  { key: "default", label: "Обычно" },
  { key: "empty-types", label: "Нет типов событий" },
  { key: "empty-slots", label: "Нет слотов" },
  { key: "conflict", label: "Конфликт 409" },
  { key: "success", label: "Успех" },
];

export type AdminScenario = "default" | "empty-types" | "empty-bookings";

export const adminScenarios: { key: AdminScenario; label: string }[] = [
  { key: "default", label: "Обычно" },
  { key: "empty-types", label: "Нет типов событий" },
  { key: "empty-bookings", label: "Нет записей" },
];
