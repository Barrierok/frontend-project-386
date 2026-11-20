import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

loadEnv({ path: [".env.local", ".env"], quiet: true });

export const testDatabaseUrl = process.env.TEST_DATABASE_URL;

export const hasTestDatabase = Boolean(testDatabaseUrl);

export function createTestPool(): Pool {
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL не задан");
  }

  return new Pool({ connectionString: testDatabaseUrl, max: 1 });
}

export function createTestDb(pool: Pool) {
  return drizzle(pool);
}

/**
 * Программно применяет миграции к тестовой базе и сообщает, что без
 * `TEST_DATABASE_URL` интеграционный прогон пропускается.
 */
export default async function globalSetup(): Promise<void> {
  if (!testDatabaseUrl) {
    console.warn(
      "\n⚠ TEST_DATABASE_URL не задан — интеграционные тесты пропущены. " +
        "Поднимите базу: npm run db:test:up и задайте TEST_DATABASE_URL.\n",
    );
    return;
  }

  const pool = new Pool({ connectionString: testDatabaseUrl, max: 1 });

  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
