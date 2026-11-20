import { RPCHandler } from "@orpc/server/fetch";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

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

function request(body: unknown): Request {
  return new Request("http://localhost/api/rpc/bookings/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: body }),
  });
}

async function handle(body: unknown) {
  if (!db) {
    throw new Error("TEST_DATABASE_URL не задан");
  }

  const handler = new RPCHandler(router);

  return handler.handle(request(body), {
    prefix: "/api/rpc",
    context: { db, now: () => new Date("2026-11-19T21:00:00.000Z") },
  });
}

const validInput = {
  eventTypeId: "call-30",
  startsAt: "2026-11-20T06:00:00.000Z",
  guestName: "Иван",
  guestEmail: "ivan@example.com",
};

describe.skipIf(!testDatabaseUrl)("RPCHandler", () => {
  beforeEach(async () => {
    await db!.insert(eventTypes).values(buildEventType({ id: "call-30" }));
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("отвечает 400 и data.issues на невалидный вход", async () => {
    const { matched, response } = await handle({ ...validInput, guestName: " " });

    expect(matched).toBe(true);
    expect(response?.status).toBe(400);

    const json: unknown = await response?.json();
    expect(json).toMatchObject({ json: { data: { issues: expect.any(Array) } } });
  });

  it("отвечает 409 SLOT_TAKEN на занятый слот", async () => {
    const first = await handle(validInput);
    expect(first.response?.status).toBe(200);

    const second = await handle(validInput);
    expect(second.response?.status).toBe(409);

    const json: unknown = await second.response?.json();
    expect(json).toMatchObject({ json: { code: "SLOT_TAKEN" } });
  });
});
