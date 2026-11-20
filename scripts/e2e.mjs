import { spawnSync } from "node:child_process";

import { ensureTestDatabase, testDatabaseUrl } from "./test-db.mjs";

ensureTestDatabase();

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npx, ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, TEST_DATABASE_URL: testDatabaseUrl() },
});

process.exit(result.status ?? 1);
