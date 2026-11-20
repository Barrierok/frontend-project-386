import { afterAll, beforeEach } from "vitest";

import { createTestPool, hasTestDatabase, testDatabaseUrl } from "./global-setup";

const pool = hasTestDatabase ? createTestPool() : undefined;

beforeEach(async () => {
  await pool?.query("truncate bookings, event_types restart identity cascade");
});

afterAll(async () => {
  await pool?.end();
});

export { testDatabaseUrl };
