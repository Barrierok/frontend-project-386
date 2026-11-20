import type { Pool } from "pg";

import { seedEventTypes } from "./seed-data";

/**
 * Идемпотентно создаёт демонстрационные типы событий.
 */
export async function applySeed(pool: Pick<Pool, "query">): Promise<void> {
  for (const eventType of seedEventTypes) {
    await pool.query(
      `insert into event_types (id, title, description, duration_minutes)
       values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [eventType.id, eventType.title, eventType.description, eventType.durationMinutes],
    );
  }
}
