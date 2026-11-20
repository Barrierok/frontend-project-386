import { RPCHandler } from "@orpc/server/fetch";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { availabilitySchema, bookingSchema } from "@/contract/schemas";
import { eventTypes } from "@/db/schema";
import { router } from "@/server/router";
import { buildEventType } from "@/test-utils/fixtures";
import {
  createTestDb,
  createTestPool,
  hasTestDatabase,
  testDatabaseUrl,
} from "@/test-utils/global-setup";

const pool = hasTestDatabase ? createTestPool() : undefined;
const db = pool ? createTestDb(pool) : undefined;

const NOW = new Date("2026-11-19T21:00:00.000Z");

function request(procedure: string, body: unknown): Request {
  return new Request(`http://localhost/api/rpc/${procedure}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: body }),
  });
}

async function handle(procedure: string, body: unknown) {
  if (!db) {
    throw new Error("TEST_DATABASE_URL не задан");
  }

  const handler = new RPCHandler(router);

  return handler.handle(request(procedure, body), {
    prefix: "/api/rpc",
    context: { db, now: () => NOW },
  });
}

function rpcBody(json: unknown): unknown {
  if (typeof json !== "object" || json === null || !("json" in json)) {
    throw new Error("Ответ RPC не содержит поля json");
  }

  return json.json;
}

const validInput = {
  eventTypeId: "call-30",
  startsAt: "2026-11-20T06:00:00.000Z",
  guestName: "Иван",
  guestEmail: "ivan@example.com",
};

function bookingInput(overrides: Partial<typeof validInput> = {}): typeof validInput {
  return { ...validInput, ...overrides };
}

describe.skipIf(!testDatabaseUrl)("RPCHandler", () => {
  beforeEach(async () => {
    await db!
      .insert(eventTypes)
      .values([
        buildEventType({ id: "call-15", title: "Звонок на 15 минут", durationMinutes: 15 }),
        buildEventType({ id: "call-30", title: "Звонок на 30 минут", durationMinutes: 30 }),
        buildEventType({ id: "call-60", title: "Звонок на 60 минут", durationMinutes: 60 }),
      ]);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("отвечает 400 и data.issues на невалидный вход", async () => {
    const { matched, response } = await handle("bookings/create", {
      ...validInput,
      guestName: " ",
    });

    expect(matched).toBe(true);
    expect(response?.status).toBe(400);

    const json: unknown = await response?.json();
    expect(json).toMatchObject({ json: { data: { issues: expect.any(Array) } } });
  });

  it("отвечает 200 и полной формой записи на свободный слот", async () => {
    const { response } = await handle("bookings/create", validInput);

    expect(response?.status).toBe(200);

    const json: unknown = await response?.json();
    const booking = bookingSchema.parse(rpcBody(json));

    expect(booking).toEqual({
      id: expect.any(String),
      startsAt: "2026-11-20T06:00:00.000Z",
      endsAt: "2026-11-20T06:30:00.000Z",
      guestName: "Иван",
      guestEmail: "ivan@example.com",
      createdAt: expect.any(String),
      eventType: {
        id: "call-30",
        title: "Звонок на 30 минут",
        durationMinutes: 30,
      },
    });
  });

  it("отвечает 409 SLOT_UNAVAILABLE на старт с секундами", async () => {
    const { response } = await handle(
      "bookings/create",
      bookingInput({ startsAt: "2026-11-20T06:00:30.000Z" }),
    );

    expect(response?.status).toBe(409);

    const json: unknown = await response?.json();
    expect(json).toMatchObject({ json: { code: "SLOT_UNAVAILABLE" } });
  });

  it("отвечает 409 SLOT_TAKEN на повторную запись того же типа", async () => {
    const first = await handle("bookings/create", validInput);
    expect(first.response?.status).toBe(200);

    const second = await handle("bookings/create", validInput);
    expect(second.response?.status).toBe(409);

    const json: unknown = await second.response?.json();
    expect(json).toMatchObject({ json: { code: "SLOT_TAKEN" } });
  });

  it("отвечает 409 SLOT_TAKEN, когда слот занят записью другого типа", async () => {
    const first = await handle(
      "bookings/create",
      bookingInput({ eventTypeId: "call-15", startsAt: "2026-11-20T06:00:00.000Z" }),
    );
    expect(first.response?.status).toBe(200);

    const second = await handle(
      "bookings/create",
      bookingInput({ eventTypeId: "call-30", startsAt: "2026-11-20T06:00:00.000Z" }),
    );
    expect(second.response?.status).toBe(409);

    const json: unknown = await second.response?.json();
    expect(json).toMatchObject({ json: { code: "SLOT_TAKEN" } });
  });

  it("отвечает 409 SLOT_TAKEN при частичном наложении 60 и 30 минут", async () => {
    // 60 минут в 10:00 и 30 минут в 10:30 по Москве: второй старт валиден
    // по сетке своего типа, но пересекается с первой записью.
    const first = await handle(
      "bookings/create",
      bookingInput({ eventTypeId: "call-60", startsAt: "2026-11-20T07:00:00.000Z" }),
    );
    expect(first.response?.status).toBe(200);

    const second = await handle(
      "bookings/create",
      bookingInput({ eventTypeId: "call-30", startsAt: "2026-11-20T07:30:00.000Z" }),
    );
    expect(second.response?.status).toBe(409);

    const json: unknown = await second.response?.json();
    expect(json).toMatchObject({ json: { code: "SLOT_TAKEN" } });
  });

  it("не предлагает занятый слот в availability.get другого типа", async () => {
    await handle(
      "bookings/create",
      bookingInput({ eventTypeId: "call-15", startsAt: "2026-11-20T06:00:00.000Z" }),
    );

    const { response } = await handle("availability/get", { eventTypeId: "call-30" });
    expect(response?.status).toBe(200);

    const json: unknown = await response?.json();
    const availability = availabilitySchema.parse(rpcBody(json));
    const times = availability.days[0].slots.map(({ startsAt }) => startsAt);

    expect(availability.days[0].date).toBe("2026-11-20");
    expect(times).not.toContain("2026-11-20T06:00:00.000Z");
    expect(times).toContain("2026-11-20T06:30:00.000Z");
  });

  it("отвечает 404 EVENT_TYPE_NOT_FOUND для availability.get", async () => {
    const { response } = await handle("availability/get", { eventTypeId: "call-99" });

    expect(response?.status).toBe(404);

    const json: unknown = await response?.json();
    expect(json).toMatchObject({ json: { code: "EVENT_TYPE_NOT_FOUND" } });
  });

  it("отвечает 404 EVENT_TYPE_NOT_FOUND для bookings.create", async () => {
    const { response } = await handle("bookings/create", bookingInput({ eventTypeId: "call-99" }));

    expect(response?.status).toBe(404);

    const json: unknown = await response?.json();
    expect(json).toMatchObject({ json: { code: "EVENT_TYPE_NOT_FOUND" } });
  });

  it("отвечает 409 EVENT_TYPE_EXISTS на дубль слага", async () => {
    const { response } = await handle("eventTypes/create", {
      id: "call-30",
      title: "Дубль",
      durationMinutes: 30,
    });

    expect(response?.status).toBe(409);

    const json: unknown = await response?.json();
    expect(json).toMatchObject({ json: { code: "EVENT_TYPE_EXISTS" } });
  });

  it("отвечает 503 SLOT_TIMEOUT при превышении statement_timeout", async () => {
    await pool!.query(`
        create or replace function slow_booking_insert() returns trigger
        language plpgsql as $$
        begin
          perform pg_sleep(6);
          return new;
        end;
        $$;
        create trigger slow_booking_insert
          before insert on bookings
          for each row execute function slow_booking_insert();
      `);

    try {
      const { response } = await handle("bookings/create", validInput);

      expect(response?.status).toBe(503);

      const json: unknown = await response?.json();
      expect(json).toMatchObject({ json: { code: "SLOT_TIMEOUT" } });
    } finally {
      await pool!.query(`
          drop trigger if exists slow_booking_insert on bookings;
          drop function if exists slow_booking_insert();
        `);
    }
  }, 15_000);
});
