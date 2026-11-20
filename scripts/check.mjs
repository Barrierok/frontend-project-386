import { spawnSync } from "node:child_process";

import { ensureTestDatabase, testDatabaseUrl } from "./test-db.mjs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

ensureTestDatabase();

const env = { ...process.env, TEST_DATABASE_URL: testDatabaseUrl() };
const steps = ["format:check", "lint", "typecheck", "test:coverage:run", "test:e2e"];

for (const script of steps) {
  console.warn(`\n▶ npm run ${script}`);

  const result = spawnSync(npm, ["run", script], { stdio: "inherit", env });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
