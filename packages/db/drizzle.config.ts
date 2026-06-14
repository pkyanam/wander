import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// For local CLI tooling, load env from the web app's .env.local (single source
// of truth for local dev). In Docker/Coolify, DATABASE_URL comes from the
// container environment instead, so these calls are simply no-ops.
config({ path: resolve(process.cwd(), "../../apps/web/.env.local") });
config({ path: resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
