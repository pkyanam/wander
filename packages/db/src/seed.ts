/**
 * Seeds tags + the curated catalog. Idempotent: safe to run repeatedly.
 * Run with `pnpm db:seed` (after `pnpm db:migrate`).
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { INTEREST_TAGS } from "@wander/shared";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "./client";
import { destinationTags, destinations, tags } from "./schema";
import { SEED_CATALOG } from "./catalog/seed-catalog";

config({ path: resolve(process.cwd(), "../../apps/web/.env.local") });
config({ path: resolve(process.cwd(), ".env") });

function toDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function main() {
  const db = getDb();

  // 1. Upsert the canonical interest tags + any tags referenced by the catalog.
  const catalogTagSlugs = new Set(SEED_CATALOG.flatMap((d) => d.tags));
  const tagDefs = new Map(INTEREST_TAGS.map((t) => [t.slug, t.label]));
  const allTagSlugs = new Set([...tagDefs.keys(), ...catalogTagSlugs]);

  for (const slug of allTagSlugs) {
    const label =
      tagDefs.get(slug) ??
      slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    await db
      .insert(tags)
      .values({ slug, label })
      .onConflictDoUpdate({ target: tags.slug, set: { label } });
  }

  const tagRows = await db.select({ id: tags.id, slug: tags.slug }).from(tags);
  const tagIdBySlug = new Map(tagRows.map((t) => [t.slug, t.id]));

  // 2. Figure out which catalog URLs already exist (for the import audit).
  const urls = SEED_CATALOG.map((d) => d.url);
  const existing = await db
    .select({ url: destinations.url })
    .from(destinations)
    .where(inArray(destinations.url, urls));
  const existingUrls = new Set(existing.map((d) => d.url));

  let created = 0;
  let updated = 0;

  // 3. Upsert each destination and (re)link its tags.
  for (const entry of SEED_CATALOG) {
    const domain = toDomain(entry.url);
    const [row] = await db
      .insert(destinations)
      .values({
        url: entry.url,
        domain,
        title: entry.title,
        hook: entry.hook,
        summary: entry.summary ?? null,
        imageUrl: null,
        sourceType: "seed",
        status: "approved",
        qualityScore: entry.qualityScore,
        contentFlags: [],
      })
      .onConflictDoUpdate({
        target: destinations.url,
        set: {
          domain,
          title: entry.title,
          hook: entry.hook,
          summary: entry.summary ?? null,
          qualityScore: entry.qualityScore,
          status: "approved",
          sourceType: "seed",
          updatedAt: new Date(),
        },
      })
      .returning({ id: destinations.id });

    if (!row) continue;
    if (existingUrls.has(entry.url)) updated++;
    else created++;

    // Re-sync tag links so edits to the fixture take effect.
    await db
      .delete(destinationTags)
      .where(eq(destinationTags.destinationId, row.id));

    const links = entry.tags
      .map((slug) => tagIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id))
      .map((tagId) => ({ destinationId: row.id, tagId }));

    if (links.length > 0) {
      await db.insert(destinationTags).values(links).onConflictDoNothing();
    }
  }

  console.log(
    `[seed] tags=${allTagSlugs.size} destinations=${SEED_CATALOG.length} (created=${created}, updated=${updated})`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  });
