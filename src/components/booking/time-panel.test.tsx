import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TimePanel } from "./time-panel";

describe("Панель времени", () => {
  afterEach(cleanup);

  it("сообщает, что у дня нет свободных слотов", () => {
    render(
      <TimePanel
        day={{ date: "2026-11-20", slots: [] }}
        selectedStartsAt={null}
        onSelectSlot={() => {}}
      />,
    );

    expect(screen.getByText("В этот день свободных слотов нет.")).toBeInTheDocument();
  });

  it("показывает кнопки стартов", () => {
    render(
      <TimePanel
        day={{
          date: "2026-11-20",
          slots: [
            { startsAt: "2026-11-20T06:00:00.000Z" },
            { startsAt: "2026-11-20T06:30:00.000Z" },
          ],
        }}
        selectedStartsAt="2026-11-20T06:30:00.000Z"
        onSelectSlot={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:30" })).toHaveAttribute("aria-pressed", "true");
  });
});
