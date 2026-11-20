import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    name: "integration",
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    globalSetup: ["./src/test-utils/global-setup.ts"],
    setupFiles: ["./src/test-utils/integration-setup.ts"],
    fileParallelism: false,
  },
});
