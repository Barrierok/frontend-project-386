import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildBooking, buildEventType } from "@/test-utils/fixtures";
import {
  createTestDb,
  createTestPool,
  hasTestDatabase,
  testDatabaseUrl,
} from "@/test-utils/global-setup";

import { bookings, eventTypes } from "./schema";

const pool = hasTestDatabase ? createTestPool() : undefined;

function db() {
  if (!pool) {
    throw new Error("TEST_DATABASE_URL не задан");
  }

  return createTestDb(pool);
}

async function insertEventType(): Promise<void> {
  await db().insert(eventTypes).values(buildEventType());
}

function insertSql(params: { startsAt: Date; endsAt: Date; onConflict: boolean }): {
  text: string;
  values: unknown[];
} {
  const conflict = params.onConflict
    ? " on conflict on constraint bookings_no_overlap do nothing"
    : "";

  return {
    text: `insert into bookings (event_type_id, starts_at, ends_at, guest_name, guest_email)
           values ($1, $2, $3, $4, $5)${conflict} returning id`,
    values: [
      "call-30",
      params.startsAt.toISOString(),
      params.endsAt.toISOString(),
      "Гость",
      "guest@example.com",
    ],
  };
}

describe.skipIf(!testDatabaseUrl)("Ограничение bookings_no_overlap", () => {
  beforeEach(async () => {
    await pool?.query("truncate bookings, event_types restart identity cascade");
    await insertEventType();
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("параллельные insert по одному интервалу дают ровно одну строку", async () => {
    const booking = buildBooking();
    const query = insertSql({
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      onConflict: false,
    });

    const results = await Promise.allSettled([
      pool!.query(query.text, query.values),
      pool!.query(query.text, query.values),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const error = rejected[0];
    expect(error.reason).toMatchObject({ code: "23P01" });

    const { rows } = await pool!.query("select count(*)::int as count from bookings");
    expect(rows[0].count).toBe(1);
  });

  it("второй insert с on conflict do nothing возвращает ноль строк", async () => {
    const booking = buildBooking();
    const query = insertSql({
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      onConflict: true,
    });

    const results = await Promise.all([
      pool!.query(query.text, query.values),
      pool!.query(query.text, query.values),
    ]);

    expect(
      results.map(({ rowCount }) => rowCount).toSorted((a, b) => Number(a) - Number(b)),
    ).toEqual([0, 1]);

    const { rows } = await pool!.query("select count(*)::int as count from bookings");
    expect(rows[0].count).toBe(1);
  });

  it("удаление типа с записью запрещено", async () => {
    const booking = buildBooking();
    await db().insert(bookings).values(booking);

    await expect(pool!.query("delete from event_types where id = 'call-30'")).rejects.toMatchObject(
      { code: "23503" },
    );
  });
});
