import react from "@vitejs/plugin-react";
import { config as loadEnv } from "dotenv";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

loadEnv({ path: [".env.local", ".env"], quiet: true });

// Порог включается только когда есть настоящий Postgres: без него интеграционный
// проект пропускается, и гейтить покрытие нечем (SPEC §9.4).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

const unitProject = {
  extends: true,
  test: {
    name: "unit",
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
  },
};

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    projects: [unitProject, "./vitest.integration.config.mts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/components/ui/**",
        "src/app/layout.tsx",
        "src/app/globals.css",
        "src/test-utils/**",
        "**/*.d.ts",
      ],
      thresholds: hasTestDatabase
        ? {
            statements: 80,
            lines: 80,
            functions: 80,
            branches: 80,
          }
        : undefined,
    },
  },
});
