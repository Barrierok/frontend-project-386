import { defineConfig, devices } from "@playwright/test";

import { e2eDatabaseUrl } from "./e2e/database";

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Production-сборка не зависит от запущенного `next dev` и HMR:
    // e2e-сервер всегда смотрит в e2e-базу, а не в DATABASE_URL из .env.local.
    command: `npm run build && npm run start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      ...process.env,
      DATABASE_URL: e2eDatabaseUrl,
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
