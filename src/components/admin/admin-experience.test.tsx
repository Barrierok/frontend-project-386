import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Booking, EventType } from "@/contract/schemas";

import { AdminExperience } from "./admin-experience";

const eventTypes: EventType[] = [
  {
    id: "call-15",
    title: "Звонок на 15 минут",
    description: "",
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

function booking(overrides: Partial<Booking> & Pick<Booking, "id" | "startsAt">): Booking {
  const eventTypeId = overrides.eventType?.id ?? "call-15";

  return {
    endsAt: new Date(new Date(overrides.startsAt).getTime() + 15 * 60_000).toISOString(),
    guestName: "Гость",
    guestEmail: "guest@example.com",
    createdAt: "2026-11-19T12:00:00.000Z",
    eventType: {
      id: eventTypeId,
      title: eventTypeId === "call-15" ? "Звонок на 15 минут" : "Звонок на 30 минут",
      durationMinutes: eventTypeId === "call-15" ? 15 : 30,
    },
    ...overrides,
  };
}

const bookings: Booking[] = [
  booking({ id: "1", startsAt: "2026-11-20T06:00:00.000Z", guestName: "Иван" }),
  booking({ id: "2", startsAt: "2026-11-20T07:00:00.000Z", guestName: "Мария" }),
  booking({
    id: "3",
    startsAt: "2026-11-21T06:00:00.000Z",
    guestName: "Пётр",
    eventType: { id: "call-30", title: "Звонок на 30 минут", durationMinutes: 30 },
  }),
];

function feed() {
  return screen.getByRole("region", { name: "Предстоящие записи" });
}

describe("Кабинет владельца", () => {
  afterEach(cleanup);

  it("показывает все предстоящие записи по дням", () => {
    render(<AdminExperience eventTypes={eventTypes} bookings={bookings} />);

    expect(within(feed()).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: /Все типы/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(feed()).getByText("Иван")).toBeInTheDocument();
    expect(within(feed()).getAllByText(/ноября/).length).toBeGreaterThan(0);
  });

  it("фильтрует ленту по типу события на клиенте", () => {
    render(<AdminExperience eventTypes={eventTypes} bookings={bookings} />);

    fireEvent.click(screen.getByRole("button", { name: /Звонок на 15 минут/ }));

    expect(within(feed()).getAllByRole("listitem")).toHaveLength(2);
    expect(within(feed()).queryByText("Пётр")).not.toBeInTheDocument();
    expect(within(feed()).getByText("Иван")).toBeInTheDocument();
  });

  it("показывает пустые состояния без типов и без записей", () => {
    render(<AdminExperience eventTypes={[]} bookings={[]} />);

    expect(screen.getByText("Пока ни одного типа события.")).toBeInTheDocument();
    expect(screen.getByText("Записей пока нет — гости ещё не выбрали время.")).toBeInTheDocument();
  });

  it("показывает отдельный текст пустой ленты для выбранного типа", () => {
    render(<AdminExperience eventTypes={eventTypes} bookings={[bookings[2]]} />);

    fireEvent.click(screen.getByRole("button", { name: /Звонок на 15 минут/ }));

    expect(screen.getByText("По этому типу события записей пока нет.")).toBeInTheDocument();
  });
});
