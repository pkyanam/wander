import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

// Cache the client across module reloads (Next.js dev HMR) so we don't exhaust
// Postgres connections. In production the module is loaded once.
const globalForDb = globalThis as unknown as {
  __wanderSql?: ReturnType<typeof postgres>;
  __wanderDb?: Database;
};

function createConnection(): ReturnType<typeof postgres> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy apps/web/.env.example to apps/web/.env.local (local) " +
        "or provide it via the container environment (Docker/Coolify).",
    );
  }
  return postgres(url, {
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    // Avoid noisy NOTICE logs in the app output.
    onnotice: () => {},
  });
}

/**
 * Lazily resolve the Drizzle client. Lazy so that merely importing modules that
 * reference the db (e.g. route handlers) during `next build` never tries to
 * connect or throws when DATABASE_URL is absent at build time.
 */
export function getDb(): Database {
  if (globalForDb.__wanderDb) return globalForDb.__wanderDb;

  const client = globalForDb.__wanderSql ?? createConnection();
  const db = drizzle(client, { schema, casing: "snake_case" });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__wanderSql = client;
    globalForDb.__wanderDb = db;
  }
  return db;
}

export { schema };
