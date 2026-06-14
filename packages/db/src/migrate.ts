/**
 * Applies pending Drizzle migrations. Run via `pnpm db:migrate` locally, and as
 * part of the container entrypoint in Docker/Coolify before the server starts.
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: resolve(process.cwd(), "../../apps/web/.env.local") });
config({ path: resolve(process.cwd(), ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set; cannot run migrations.");
}

// In Docker the bundled migrator + SQL live at a fixed path (set via env);
// locally it resolves relative to this file.
const migrationsFolder =
  process.env.MIGRATIONS_DIR ??
  fileURLToPath(new URL("../drizzle", import.meta.url));

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client);

console.log(`[migrate] applying migrations from ${migrationsFolder}`);
await migrate(db, { migrationsFolder });
console.log("[migrate] done");

await client.end();
