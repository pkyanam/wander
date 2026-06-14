/**
 * The single destination import implementation, shared by the Wander API
 * (admin import + curation approve) and the curation CLI. Keeping it here means
 * there is exactly one write path into `destinations` + `destination_tags`.
 */

import { getTag, getDomain, type DestinationInput } from "@wander/shared";
import { eq, inArray } from "drizzle-orm";
import { getDb, type Database } from "./client";
import { destinationTags, destinations, tags } from "./schema";

function labelFor(slug: string): string {
  return (
    getTag(slug)?.label ??
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Upsert tags by slug (auto-labelled when unknown) and return slug→id map. */
export async function ensureTags(
  slugs: string[],
  db: Database = getDb(),
): Promise<Map<string, string>> {
  const unique = [...new Set(slugs)];
  for (const slug of unique) {
    await db
      .insert(tags)
      .values({ slug, label: labelFor(slug) })
      .onConflictDoUpdate({
        target: tags.slug,
        set: { label: labelFor(slug) },
      });
  }
  const rows = unique.length
    ? await db
        .select({ id: tags.id, slug: tags.slug })
        .from(tags)
        .where(inArray(tags.slug, unique))
    : [];
  return new Map(rows.map((r) => [r.slug, r.id]));
}

/** Replace a destination's tag links (auto-creating any unknown tags). */
export async function setDestinationTags(
  destinationId: string,
  slugs: string[],
  db: Database = getDb(),
): Promise<void> {
  await db
    .delete(destinationTags)
    .where(eq(destinationTags.destinationId, destinationId));
  if (slugs.length === 0) return;
  const tagIds = await ensureTags(slugs, db);
  const links = [...tagIds.values()].map((tagId) => ({ destinationId, tagId }));
  if (links.length > 0) {
    await db.insert(destinationTags).values(links).onConflictDoNothing();
  }
}

/** Create or update a destination by URL and (re)link its tags. */
export async function upsertDestinationWithTags(
  input: DestinationInput,
  db: Database = getDb(),
): Promise<{ id: string; created: boolean }> {
  const domain = getDomain(input.url);

  const existing = await db
    .select({ id: destinations.id })
    .from(destinations)
    .where(eq(destinations.url, input.url))
    .limit(1);
  const wasExisting = Boolean(existing[0]);

  const values = {
    url: input.url,
    domain,
    title: input.title,
    hook: input.hook,
    summary: input.summary ?? null,
    imageUrl: input.imageUrl ?? null,
    sourceType: input.sourceType,
    status: input.status,
    qualityScore: input.qualityScore,
    contentFlags: input.contentFlags,
  };

  const [row] = await db
    .insert(destinations)
    .values(values)
    .onConflictDoUpdate({
      target: destinations.url,
      set: { ...values, updatedAt: new Date() },
    })
    .returning({ id: destinations.id });
  const id = row!.id;

  await setDestinationTags(id, input.tags, db);
  return { id, created: !wasExisting };
}
