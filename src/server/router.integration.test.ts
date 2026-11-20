import { createRouterClient } from "@orpc/server";
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

function client() {
  if (!db) {
    throw new Error("TEST_DATABASE_URL не задан");
  }

  return createRouterClient(router, {
    context: { db, now: () => new Date("2026-11-20T06:00:00.000Z") },
  });
}

describe.skipIf(!testDatabaseUrl)("eventTypes.list", () => {
  beforeEach(async () => {
    await pool?.query("truncate bookings, event_types restart identity cascade");
  });

  afterAll(async () => {
    await pool?.end();
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
});
