import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

import { getPool } from "./index";
import { seedEventTypes } from "./seed-data";

async function seed(): Promise<void> {
  const pool = getPool();

  for (const eventType of seedEventTypes) {
    await pool.query(
      `insert into event_types (id, title, description, duration_minutes)
       values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [eventType.id, eventType.title, eventType.description, eventType.durationMinutes],
    );
  }

  await pool.end();
  console.warn("Сиды применены: " + seedEventTypes.map(({ id }) => id).join(", "));
}

seed().catch((error: unknown) => {
  console.error("Не удалось применить сиды", error);
  process.exitCode = 1;
});
