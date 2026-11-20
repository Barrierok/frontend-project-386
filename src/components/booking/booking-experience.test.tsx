import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DaySlots, EventType } from "@/contract/schemas";

import { BookingExperience } from "./booking-experience";

const availability = vi.hoisted(() => ({
  days: [] as DaySlots[],
  get: vi.fn<(input: { eventTypeId: string }) => Promise<{ days: DaySlots[] }>>(),
}));

vi.mock("@/lib/orpc-client", () => ({
  orpcClient: {
    availability: {
      get: availability.get,
    },
  },
}));

const eventTypes: EventType[] = [
  {
    id: "call-15",
    title: "Звонок на 15 минут",
    description: "Короткий звонок.",
    durationMinutes: 15,
    createdAt: "2026-11-19T10:00:00.000Z",
  },
  {
    id: "call-30",
    title: "Звонок на 30 минут",
    description: "",
    durationMinutes: 30,
    createdAt: "2026-11-19T11:00:00.000Z",
  },
];

function buildDays(slotCounts: number[]): DaySlots[] {
  const start = Date.UTC(2026, 10, 20);

  return slotCounts.map((count, index) => {
    const date = new Date(start + index * 86_400_000).toISOString().slice(0, 10);

    return {
      date,
      slots: Array.from({ length: count }, (_, slotIndex) => ({
        startsAt: `${date}T${String(6 + slotIndex).padStart(2, "0")}:00:00.000Z`,
      })),
    };
  });
}

describe("Форма записи", () => {
  beforeEach(() => {
    availability.days = buildDays([2, 0, 1, ...Array.from({ length: 11 }, () => 0)]);
    availability.get.mockReset();
    availability.get.mockResolvedValue({ days: availability.days });
  });

  afterEach(cleanup);

  it("выбирает первый тип события и показывает его панель", () => {
    render(<BookingExperience eventTypes={eventTypes} />);

    expect(screen.getByLabelText("Тип события")).toBeInTheDocument();
    expect(screen.getByText("Звонок на 15 минут")).toBeInTheDocument();
    expect(screen.getByText("15 мин")).toBeInTheDocument();
    expect(screen.getByText("Короткий звонок.")).toBeInTheDocument();
  });

  it("не рендерит пустое описание", async () => {
    render(<BookingExperience eventTypes={[eventTypes[1]]} />);

    await waitFor(() => expect(availability.get).toHaveBeenCalled());

    expect(screen.queryByText("Короткий звонок.")).not.toBeInTheDocument();
  });

  it("показывает 14 дней, счётчики и первый доступный день", async () => {
    render(<BookingExperience eventTypes={eventTypes} />);

    const calendar = await screen.findByRole("group", { name: "Дни окна записи" });
    const days = screen.getAllByRole("button", { name: /места|место|нет/ });

    expect(days).toHaveLength(14);
    expect(calendar).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2 места/ })).toHaveAttribute("aria-pressed", "true");
    for (const emptyDay of screen.getAllByRole("button", { name: /нет/ })) {
      expect(emptyDay).toBeDisabled();
    }
  });

  it("показывает баннер, если во всём окне нет слотов", async () => {
    availability.days = buildDays(Array.from({ length: 14 }, () => 0));
    availability.get.mockResolvedValue({ days: availability.days });

    render(<BookingExperience eventTypes={eventTypes} />);

    expect(await screen.findByText("Свободных слотов в ближайшие 14 дней нет")).toBeInTheDocument();
  });
});
