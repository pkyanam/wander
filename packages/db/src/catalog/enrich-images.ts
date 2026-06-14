/**
 * Backfills `destinations.image_url` with a hero image for each destination,
 * using OpenGraph metadata first and a hosted screenshot service as fallback
 * (see `enrich.ts`). Also stamps `last_checked_at`.
 *
 * Idempotent and re-runnable. By default it only touches rows missing an image.
 *
 * Usage (from packages/db):
 *   pnpm enrich               # fill images for destinations with image_url IS NULL
 *   pnpm enrich --all         # re-resolve every destination
 *   pnpm enrich --og-only     # skip the screenshot fallback
 *   pnpm enrich --limit=50    # cap how many to process this run
 *   pnpm enrich --concurrency=4
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { eq, isNull } from "drizzle-orm";
import { getDb } from "../client";
import { destinations } from "../schema";
import { resolveImage } from "./enrich";

config({ path: resolve(process.cwd(), "../../apps/web/.env.local") });
config({ path: resolve(process.cwd(), ".env") });

interface Options {
  all: boolean;
  ogOnly: boolean;
  limit: number | null;
  concurrency: number;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    all: false,
    ogOnly: false,
    limit: null,
    concurrency: 4,
  };
  for (const arg of argv) {
    if (arg === "--all") opts.all = true;
    else if (arg === "--og-only") opts.ogOnly = true;
    else if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) opts.limit = Math.floor(n);
    } else if (arg.startsWith("--concurrency=")) {
      const n = Number(arg.slice("--concurrency=".length));
      if (Number.isFinite(n) && n > 0) opts.concurrency = Math.floor(n);
    }
  }
  return opts;
}

/** Run `worker` over `items` with at most `concurrency` in flight. */
async function pooled<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        await worker(items[index]!, index);
      }
    },
  );
  await Promise.all(runners);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const db = getDb();

  let query = db
    .select({ id: destinations.id, url: destinations.url })
    .from(destinations)
    .$dynamic();
  if (!opts.all) query = query.where(isNull(destinations.imageUrl));

  let rows = await query;
  if (opts.limit !== null) rows = rows.slice(0, opts.limit);

  if (rows.length === 0) {
    console.log(
      "[enrich] nothing to do — all destinations already have images.",
    );
    return;
  }

  console.log(
    `[enrich] resolving images for ${rows.length} destination(s) ` +
      `(concurrency=${opts.concurrency}${opts.ogOnly ? ", og-only" : ""})…`,
  );

  const counts = { og: 0, screenshot: 0, none: 0 };

  await pooled(rows, opts.concurrency, async (row) => {
    const { imageUrl, source } = await resolveImage(row.url, {
      ogOnly: opts.ogOnly,
    });
    counts[source]++;

    await db
      .update(destinations)
      .set({ imageUrl, lastCheckedAt: new Date(), updatedAt: new Date() })
      .where(eq(destinations.id, row.id));

    const label = imageUrl ? `${source}` : "no image";
    console.log(`  ${label.padEnd(10)} ${row.url}`);
  });

  console.log(
    `[enrich] done — og=${counts.og} screenshot=${counts.screenshot} ` +
      `none=${counts.none} (total=${rows.length})`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[enrich] failed:", err);
    process.exit(1);
  });
