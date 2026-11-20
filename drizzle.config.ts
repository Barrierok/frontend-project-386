import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { withLibpqSslCompat } from "./src/db/connection-url";

config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: withLibpqSslCompat(process.env.DIRECT_URL ?? ""),
  },
});
