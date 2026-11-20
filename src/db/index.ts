import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

type DatabaseState = {
  pool: Pool;
  db: Database;
};

let state: DatabaseState | undefined;

/**
 * Ленивый singleton пула: на этапе импорта ничего не создаётся, поэтому
 * сборка без `DATABASE_URL` проходит.
 */
export function getDb(): Database {
  if (!state) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL не задан");
    }

    const pool = new Pool({
      connectionString,
      max: 1,
      // Transaction pooler Supabase не поддерживает named prepared statements.
      // node-postgres не готовит запросы с именами, поэтому опция драйверу не нужна.
    });

    state = { pool, db: drizzle(pool, { schema }) };
  }

  return state.db;
}

export function getPool(): Pool {
  getDb();

  if (!state) {
    throw new Error("DATABASE_URL не задан");
  }

  return state.pool;
}

export async function closeDb(): Promise<void> {
  if (!state) {
    return;
  }

  const { pool } = state;
  state = undefined;
  await pool.end();
}

export { schema };
