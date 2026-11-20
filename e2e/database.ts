import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

/**
 * База e2e-тестов. По умолчанию — Postgres из `docker-compose.test.yml`;
 * `TEST_DATABASE_URL` позволяет указать другой экземпляр.
 */
export const e2eDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/calendar_test";
