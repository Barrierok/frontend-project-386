import { describe, expect, it } from "vitest";

import { isSlotBookable, moscowMinuteOfDay } from "./slot-validation";

const NOW = new Date("2026-11-19T21:00:00.000Z");

function minutes(date: string): number {
  return moscowMinuteOfDay(new Date(date));
}

describe("moscowMinuteOfDay", () => {
  it("переводит момент в московские минуты от полуночи", () => {
    expect(minutes("2026-11-20T06:00:00.000Z")).toBe(540);
    expect(minutes("2026-11-20T14:45:00.000Z")).toBe(1065);
  });
});

describe("isSlotBookable", () => {
  it("принимает слот в рабочих часах по сетке", () => {
    expect(
      isSlotBookable({
        startsAt: new Date("2026-11-20T06:00:00.000Z"),
        durationMinutes: 30,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("отклоняет слот в прошлом", () => {
    expect(
      isSlotBookable({
        startsAt: new Date("2026-11-19T22:00:00.000Z"),
        durationMinutes: 30,
        now: new Date("2026-11-19T23:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("отклоняет слот до окна и после окна", () => {
    expect(
      isSlotBookable({
        startsAt: new Date("2026-11-19T06:00:00.000Z"),
        durationMinutes: 30,
        now: NOW,
      }),
    ).toBe(false);

    expect(
      isSlotBookable({
        startsAt: new Date("2026-12-04T06:00:00.000Z"),
        durationMinutes: 30,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("отклоняет слот вне 09:00–18:00", () => {
    expect(
      isSlotBookable({
        startsAt: new Date("2026-11-20T03:00:00.000Z"),
        durationMinutes: 30,
        now: NOW,
      }),
    ).toBe(false);

    expect(
      isSlotBookable({
        startsAt: new Date("2026-11-20T14:45:00.000Z"),
        durationMinutes: 30,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("отклоняет слот не по шагу длительности", () => {
    expect(
      isSlotBookable({
        startsAt: new Date("2026-11-20T06:10:00.000Z"),
        durationMinutes: 30,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("отклоняет старт с секундами и миллисекундами", () => {
    for (const startsAt of ["2026-11-20T06:00:30.000Z", "2026-11-20T06:00:00.001Z"]) {
      expect(
        isSlotBookable({
          startsAt: new Date(startsAt),
          durationMinutes: 30,
          now: NOW,
        }),
      ).toBe(false);
    }
  });
});
