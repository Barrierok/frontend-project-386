import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { closeDb } from "@/db";
import { eventTypes } from "@/db/schema";
import { createServerClient } from "@/server/client";
import {
  createTestDb,
  createTestPool,
  hasTestDatabase,
  testDatabaseUrl,
} from "@/test-utils/global-setup";

import { GET } from "./[[...rest]]/route";

const pool = hasTestDatabase ? createTestPool() : undefined;
const db = pool ? createTestDb(pool) : undefined;
const originalUrl = process.env.DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("RPC route", () => {
  beforeAll(() => {
    process.env.DATABASE_URL = testDatabaseUrl;
  });

  beforeEach(async () => {
    await pool!.query("truncate bookings, event_types restart identity cascade");
    await db!.insert(eventTypes).values({
      id: "call-30",
      title: "Звонок на 30 минут",
      durationMinutes: 30,
    });
  });

  afterAll(async () => {
    await closeDb();
    await pool?.end();
    process.env.DATABASE_URL = originalUrl;
  });

  it("отвечает на GET со списком типов и запрещает кеширование", async () => {
    const response = await GET(new Request("http://localhost/api/rpc/eventTypes/list"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const json: unknown = await response.json();
    expect(json).toMatchObject({ json: [{ id: "call-30" }] });
  });

  it("отвечает 404 на неизвестный путь", async () => {
    const response = await GET(new Request("http://localhost/api/rpc/unknown"));

    expect(response.status).toBe(404);
  });

  it("createServerClient вызывает роутер в процессе", async () => {
    const types = await createServerClient().eventTypes.list();

    expect(types.map(({ id }) => id)).toEqual(["call-30"]);
  });
});
