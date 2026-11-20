import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { EventType } from "@/contract/schemas";

import { BookingExperience } from "./booking-experience";

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

describe("Форма записи", () => {
  afterEach(cleanup);

  it("выбирает первый тип события и показывает его панель", () => {
    render(<BookingExperience eventTypes={eventTypes} />);

    expect(screen.getByLabelText("Тип события")).toBeInTheDocument();
    expect(screen.getByText("Звонок на 15 минут")).toBeInTheDocument();
    expect(screen.getByText("15 мин")).toBeInTheDocument();
    expect(screen.getByText("Короткий звонок.")).toBeInTheDocument();
  });

  it("не рендерит пустое описание", () => {
    render(<BookingExperience eventTypes={[eventTypes[1]]} />);

    expect(screen.queryByText("Короткий звонок.")).not.toBeInTheDocument();
  });
});
