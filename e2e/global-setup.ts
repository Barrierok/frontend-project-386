import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { applySeed } from "../src/db/seed";
import { e2eDatabaseUrl } from "./database";

/**
 * Приводит e2e-базу к предсказуемому состоянию: применяет миграции,
 * очищает записи и создаёт типы событий из сидов.
 */
export default async function globalSetup(): Promise<void> {
  const pool = new Pool({ connectionString: e2eDatabaseUrl, max: 1 });

  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    await pool.query("truncate bookings, event_types restart identity cascade");
    await applySeed(pool);
  } finally {
    await pool.end();
  }
}
