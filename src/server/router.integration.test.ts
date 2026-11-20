import { createRouterClient } from "@orpc/server";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { bookings, eventTypes } from "@/db/schema";
import { router } from "@/server/router";
import { buildBooking, buildEventType } from "@/test-utils/fixtures";
import {
  createTestDb,
  createTestPool,
  hasTestDatabase,
  testDatabaseUrl,
} from "@/test-utils/global-setup";

const pool = hasTestDatabase ? createTestPool() : undefined;
const db = pool ? createTestDb(pool) : undefined;

function client(now = new Date("2026-11-19T21:00:00.000Z")) {
  if (!db) {
    throw new Error("TEST_DATABASE_URL не задан");
  }

  return createRouterClient(router, { context: { db, now: () => now } });
}

describe.skipIf(!testDatabaseUrl)("eventTypes.list", () => {
  beforeEach(async () => {
    await pool?.query("truncate bookings, event_types restart identity cascade");
  });

  it("возвращает пустой список, когда типов нет", async () => {
    await expect(client().eventTypes.list()).resolves.toEqual([]);
  });

  it("сортирует по created_at, при равенстве — по id", async () => {
    await db!.insert(eventTypes).values([
      buildEventType({
        id: "call-30",
        title: "Звонок на 30 минут",
        createdAt: new Date("2026-11-19T10:00:00.000Z"),
      }),
      buildEventType({
        id: "call-15",
        title: "Звонок на 15 минут",
        durationMinutes: 15,
        createdAt: new Date("2026-11-19T10:00:00.000Z"),
      }),
      buildEventType({
        id: "intro",
        title: "Знакомство",
        durationMinutes: 45,
        createdAt: new Date("2026-11-18T10:00:00.000Z"),
      }),
    ]);

    const result = await client().eventTypes.list();

    expect(result.map(({ id }) => id)).toEqual(["intro", "call-15", "call-30"]);
    expect(result[1]).toMatchObject({
      id: "call-15",
      title: "Звонок на 15 минут",
      durationMinutes: 15,
      createdAt: "2026-11-19T10:00:00.000Z",
    });
  });

  describe("availability.get", () => {
    beforeEach(async () => {
      await db!.insert(eventTypes).values(buildEventType({ id: "call-15", durationMinutes: 15 }));
    });

    it("возвращает все 14 дней и исключает занятые слоты", async () => {
      await db!.insert(bookings).values(
        buildBooking({
          eventTypeId: "call-15",
          startsAt: new Date("2026-11-20T06:00:00.000Z"),
          endsAt: new Date("2026-11-20T06:30:00.000Z"),
        }),
      );

      const { days } = await client().availability.get({ eventTypeId: "call-15" });

      expect(days).toHaveLength(14);
      expect(days[0].date).toBe("2026-11-20");

      const firstDayTimes = days[0].slots.map(({ startsAt }) => startsAt.slice(11, 16));
      expect(firstDayTimes).not.toContain("06:00");
      expect(firstDayTimes).not.toContain("06:15");
      expect(firstDayTimes).toContain("06:30");
    });

    it("возвращает EVENT_TYPE_NOT_FOUND для неизвестного типа", async () => {
      await expect(client().availability.get({ eventTypeId: "call-99" })).rejects.toMatchObject({
        code: "EVENT_TYPE_NOT_FOUND",
      });
    });
  });
});

function bookingInput(overrides: Record<string, string> = {}) {
  return {
    eventTypeId: "call-30",
    startsAt: "2026-11-20T06:00:00.000Z",
    guestName: "Иван",
    guestEmail: "ivan@example.com",
    ...overrides,
  };
}

describe.skipIf(!testDatabaseUrl)("bookings.create", () => {
  beforeEach(async () => {
    await db!.insert(eventTypes).values(buildEventType({ id: "call-30", durationMinutes: 30 }));
  });

  it("создаёт запись на свободный слот и считает конец", async () => {
    const booking = await client().bookings.create(bookingInput());

    expect(booking).toMatchObject({
      startsAt: "2026-11-20T06:00:00.000Z",
      endsAt: "2026-11-20T06:30:00.000Z",
      guestName: "Иван",
      guestEmail: "ivan@example.com",
      eventType: { id: "call-30", title: "Звонок на 30 минут", durationMinutes: 30 },
    });
  });

  it("возвращает SLOT_TAKEN на повторное бронирование", async () => {
    await client().bookings.create(bookingInput());

    await expect(client().bookings.create(bookingInput())).rejects.toMatchObject({
      code: "SLOT_TAKEN",
    });
  });

  it("возвращает SLOT_UNAVAILABLE вне шага, рабочих часов и в прошлом", async () => {
    await expect(
      client().bookings.create(bookingInput({ startsAt: "2026-11-20T06:10:00.000Z" })),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });

    await expect(
      client().bookings.create(bookingInput({ startsAt: "2026-11-20T03:00:00.000Z" })),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });

    await expect(
      client().bookings.create(bookingInput({ startsAt: "2026-11-20T15:30:00.000Z" })),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });

    await expect(
      client(new Date("2026-11-20T07:00:00.000Z")).bookings.create(bookingInput()),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("возвращает EVENT_TYPE_NOT_FOUND для несуществующего типа", async () => {
    await expect(
      client().bookings.create(bookingInput({ eventTypeId: "call-99" })),
    ).rejects.toMatchObject({ code: "EVENT_TYPE_NOT_FOUND" });
  });

  it("исключает созданную запись из availability.get", async () => {
    await client().bookings.create(bookingInput());

    const { days } = await client().availability.get({ eventTypeId: "call-30" });
    const times = days[0].slots.map(({ startsAt }) => startsAt);

    expect(times).not.toContain("2026-11-20T06:00:00.000Z");
    expect(times).toContain("2026-11-20T06:30:00.000Z");
  });

  it("при параллельной записи проходит ровно одна", async () => {
    const secondPool = createTestPool();
    const secondDb = createTestDb(secondPool);
    const secondClient = createRouterClient(router, {
      context: { db: secondDb, now: () => new Date("2026-11-20T00:00:00.000Z") },
    });

    try {
      const results = await Promise.allSettled([
        client().bookings.create(bookingInput()),
        secondClient.bookings.create(bookingInput()),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toMatchObject({ code: "SLOT_TAKEN" });
    } finally {
      await secondPool.end();
    }
  });
});

describe.skipIf(!testDatabaseUrl)("bookings.listUpcoming", () => {
  beforeEach(async () => {
    await db!
      .insert(eventTypes)
      .values([
        buildEventType({ id: "call-15", title: "Звонок на 15 минут", durationMinutes: 15 }),
        buildEventType({ id: "call-30", title: "Звонок на 30 минут" }),
      ]);
  });

  it("возвращает только будущие записи по возрастанию с типом события", async () => {
    await db!.insert(bookings).values([
      buildBooking({
        eventTypeId: "call-30",
        startsAt: new Date("2026-11-18T06:00:00.000Z"),
        endsAt: new Date("2026-11-18T06:30:00.000Z"),
        guestName: "Прошлый",
      }),
      buildBooking({
        eventTypeId: "call-30",
        startsAt: new Date("2026-11-20T07:00:00.000Z"),
        endsAt: new Date("2026-11-20T07:30:00.000Z"),
        guestName: "Второй",
      }),
      buildBooking({
        eventTypeId: "call-15",
        startsAt: new Date("2026-11-20T06:00:00.000Z"),
        endsAt: new Date("2026-11-20T06:15:00.000Z"),
        guestName: "Первый",
      }),
    ]);

    const result = await client().bookings.listUpcoming();

    expect(result.map(({ guestName }) => guestName)).toEqual(["Первый", "Второй"]);
    expect(result[0].eventType).toEqual({
      id: "call-15",
      title: "Звонок на 15 минут",
      durationMinutes: 15,
    });
  });
});

describe.skipIf(!testDatabaseUrl)("eventTypes.create", () => {
  it("создаёт тип события и обрезает название", async () => {
    const created = await client().eventTypes.create({
      id: "intro-45",
      title: "  Знакомство  ",
      description: "  ",
      durationMinutes: 45,
    });

    expect(created).toMatchObject({
      id: "intro-45",
      title: "Знакомство",
      description: "",
      durationMinutes: 45,
    });
  });

  it("возвращает EVENT_TYPE_EXISTS на дубль слага", async () => {
    await client().eventTypes.create({
      id: "call-15",
      title: "Звонок",
      durationMinutes: 15,
    });

    await expect(
      client().eventTypes.create({ id: "call-15", title: "Дубль", durationMinutes: 30 }),
    ).rejects.toMatchObject({ code: "EVENT_TYPE_EXISTS" });
  });

  it("отклоняет границы длительности и формат слага", async () => {
    for (const durationMinutes of [4, 545]) {
      await expect(
        client().eventTypes.create({
          id: `call-${durationMinutes}`,
          title: "Тип",
          durationMinutes,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }

    await expect(
      client().eventTypes.create({ id: "Bad Slug", title: "Тип", durationMinutes: 30 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("принимает границы 5 и 540 минут", async () => {
    await expect(
      client().eventTypes.create({ id: "call-5", title: "Пять", durationMinutes: 5 }),
    ).resolves.toMatchObject({ durationMinutes: 5 });
    await expect(
      client().eventTypes.create({ id: "call-540", title: "Девять часов", durationMinutes: 540 }),
    ).resolves.toMatchObject({ durationMinutes: 540 });
  });
});

afterAll(async () => {
  await pool?.end();
});
