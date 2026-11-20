import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { applySeed } from "@/db/seed";
import { createTestPool, hasTestDatabase, testDatabaseUrl } from "@/test-utils/global-setup";

const pool = hasTestDatabase ? createTestPool() : undefined;

describe.skipIf(!testDatabaseUrl)("applySeed", () => {
  beforeEach(async () => {
    await pool?.query("truncate bookings, event_types restart identity cascade");
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("создаёт call-15 и call-30 идемпотентно", async () => {
    await applySeed(pool!);
    await applySeed(pool!);

    const { rows } = await pool!.query<{ id: string }>("select id from event_types order by id");

    expect(rows.map(({ id }) => id)).toEqual(["call-15", "call-30"]);
  });
});
