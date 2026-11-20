import { spawnSync } from "node:child_process";

import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const defaultTestDatabaseUrl = "postgres://postgres:postgres@localhost:5433/calendar_test";

/**
 * URL тестовой базы: внешний экземпляр из `TEST_DATABASE_URL` или Postgres
 * из `docker-compose.test.yml`.
 */
export function testDatabaseUrl() {
  return process.env.TEST_DATABASE_URL ?? defaultTestDatabaseUrl;
}

/**
 * Поднимает Docker-Postgres, если `TEST_DATABASE_URL` не задан. В CI база
 * приходит сервисом workflow, поэтому Docker не запускается.
 */
export function ensureTestDatabase() {
  if (process.env.TEST_DATABASE_URL) {
    console.warn("TEST_DATABASE_URL задан — использую существующий Postgres");
    return;
  }

  const result = spawnSync(
    "docker",
    ["compose", "-f", "docker-compose.test.yml", "up", "-d", "--wait"],
    { stdio: "inherit" },
  );

  if (result.error) {
    throw new Error(`Не удалось запустить Docker: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
