import { afterEach, describe, expect, it } from "vitest";

import { closeDb, getDb, getPool } from "@/db";
import { testDatabaseUrl } from "@/test-utils/global-setup";

const originalUrl = process.env.DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("Клиент базы", () => {
  afterEach(async () => {
    await closeDb();
    process.env.DATABASE_URL = originalUrl;
  });

  it("создаёт singleton-пул и выполняет запрос", async () => {
    process.env.DATABASE_URL = testDatabaseUrl;

    expect(getDb()).toBe(getDb());
    await expect(getPool().query("select 1")).resolves.toMatchObject({ rowCount: 1 });
  });

  it("падает без DATABASE_URL", () => {
    delete process.env.DATABASE_URL;

    expect(() => getDb()).toThrow("DATABASE_URL не задан");
  });
});
