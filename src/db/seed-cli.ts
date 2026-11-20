import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

import { getPool } from "./index";
import { applySeed } from "./seed";

async function seed(): Promise<void> {
  const pool = getPool();

  await applySeed(pool);
  await pool.end();

  console.warn("Сиды применены");
}

seed().catch((error: unknown) => {
  console.error("Не удалось применить сиды", error);
  process.exitCode = 1;
});
