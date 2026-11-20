import { describe, expect, it } from "vitest";

import { generateSlots, moscowDate } from "./slots";

const DAY_START = new Date("2026-11-19T21:00:00.000Z");

function timesOf(day: { slots: { startsAt: string }[] }): string[] {
  return day.slots.map(({ startsAt }) => startsAt.slice(11, 16));
}

describe("generateSlots", () => {
  it("строит сетку с шагом, равным длительности", () => {
    const days = generateSlots({ durationMinutes: 15, now: DAY_START, busy: [] });

    expect(timesOf(days[0])).toHaveLength(36);
    expect(timesOf(days[0])[0]).toBe("06:00");
    expect(timesOf(days[0]).at(-1)).toBe("14:45");
  });

  it("последний старт 17:45 для 15 минут и 17:30 для 30 минут по Москве", () => {
    expect(
      timesOf(generateSlots({ durationMinutes: 15, now: DAY_START, busy: [] })[0]).at(-1),
    ).toBe("14:45");
    expect(
      timesOf(generateSlots({ durationMinutes: 30, now: DAY_START, busy: [] })[0]).at(-1),
    ).toBe("14:30");
  });

  it("тип на 540 минут даёт ровно один старт — 09:00", () => {
    const days = generateSlots({ durationMinutes: 540, now: DAY_START, busy: [] });

    expect(timesOf(days[0])).toEqual(["06:00"]);
  });

  it("строит ровно 14 календарных дней", () => {
    const days = generateSlots({ durationMinutes: 30, now: DAY_START, busy: [] });

    expect(days).toHaveLength(14);
    expect(days[0].date).toBe("2026-11-20");
    expect(days.at(-1)?.date).toBe("2026-12-03");
  });

  it("считает полночь по Москве, а не по UTC", () => {
    const lateUtc = new Date("2026-11-19T22:30:00.000Z");

    expect(moscowDate(lateUtc)).toBe("2026-11-20");

    const days = generateSlots({ durationMinutes: 30, now: lateUtc, busy: [] });

    expect(days[0].date).toBe("2026-11-20");
    expect(timesOf(days[0])[0]).toBe("06:00");
  });

  it("скрывает прошедшие старты сегодняшнего дня", () => {
    const now = new Date("2026-11-20T09:00:00.000Z");

    const days = generateSlots({ durationMinutes: 30, now, busy: [] });

    expect(timesOf(days[0])[0]).toBe("09:30");
    expect(timesOf(days[1])[0]).toBe("06:00");
  });

  it("занятая запись блокирует все пересекающиеся старты", () => {
    const busy = [
      {
        startsAt: new Date("2026-11-20T06:00:00.000Z"),
        endsAt: new Date("2026-11-20T06:30:00.000Z"),
      },
    ];

    const times = timesOf(generateSlots({ durationMinutes: 15, now: DAY_START, busy })[0]);

    expect(times).not.toContain("06:00");
    expect(times).not.toContain("06:15");
    expect(times).toContain("06:30");
  });
});
