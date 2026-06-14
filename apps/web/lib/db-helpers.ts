import { getDb, schema, type DestinationRow } from "@wander/db";
import {
  DESTINATION_STATUSES,
  isKnownTag,
  type DestinationAdmin,
  type DestinationCard,
  type DestinationStatus,
  type HistoryItem,
  type InteractionType,
  type SavedItem,
} from "@wander/shared";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

const {
  destinations,
  tags,
  userInterests,
  users,
  collections,
  interactions,
  savedDestinations,
} = schema;

type TagPair = { slug: string; label: string };
type RowWithTags = DestinationRow & { destinationTags: { tag: TagPair }[] };

const withTags = {
  destinationTags: {
    with: { tag: { columns: { slug: true, label: true } } },
  },
} as const;

/** Map a destination row (+ joined tags) to the public card DTO. */
export function toCard(row: RowWithTags): DestinationCard {
  return {
    id: row.id,
    url: row.url,
    domain: row.domain,
    title: row.title,
    hook: row.hook,
    summary: row.summary,
    imageUrl: row.imageUrl,
    sourceType: row.sourceType,
    qualityScore: row.qualityScore,
    tags: row.destinationTags
      .map((dt) => ({ slug: dt.tag.slug, label: dt.tag.label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

/** Map a destination row to the richer admin DTO. */
export function toAdmin(row: RowWithTags): DestinationAdmin {
  return {
    ...toCard(row),
    status: row.status,
    contentFlags: row.contentFlags,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
  };
}

/** Load full destination cards for the given ids, preserving input order. */
export async function loadCards(ids: string[]): Promise<DestinationCard[]> {
  if (ids.length === 0) return [];
  const db = getDb();
  const rows = await db.query.destinations.findMany({
    where: inArray(destinations.id, ids),
    with: withTags,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map(toCard);
}

export async function loadCard(id: string): Promise<DestinationCard | null> {
  const [card] = await loadCards([id]);
  return card ?? null;
}

/** List destinations for the admin catalog, with status counts. */
export async function listDestinationsAdmin(opts: {
  status?: string | null;
  q?: string | null;
  limit?: number;
}): Promise<{ items: DestinationAdmin[]; counts: Record<string, number> }> {
  const db = getDb();
  const conditions: SQL[] = [];
  if (
    opts.status &&
    (DESTINATION_STATUSES as readonly string[]).includes(opts.status)
  ) {
    conditions.push(eq(destinations.status, opts.status as DestinationStatus));
  }
  const q = opts.q?.trim();
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      or(
        ilike(destinations.title, like),
        ilike(destinations.url, like),
        ilike(destinations.domain, like),
      )!,
    );
  }

  const rows = await db.query.destinations.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: desc(destinations.updatedAt),
    limit: Math.min(opts.limit ?? 100, 200),
    with: withTags,
  });

  const countRows = await db
    .select({ status: destinations.status, count: sql<number>`count(*)::int` })
    .from(destinations)
    .groupBy(destinations.status);

  return {
    items: rows.map(toAdmin),
    counts: Object.fromEntries(countRows.map((c) => [c.status, c.count])),
  };
}

/** Load a single destination as the admin DTO. */
export async function loadAdmin(id: string): Promise<DestinationAdmin | null> {
  const db = getDb();
  const row = await db.query.destinations.findFirst({
    where: eq(destinations.id, id),
    with: withTags,
  });
  return row ? toAdmin(row) : null;
}

/** Resolve (or lazily create) the user's default Saved collection id. */
export async function getDefaultCollectionId(userId: string): Promise<string> {
  const db = getDb();
  const existing = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.userId, userId), eq(collections.isDefault, true)))
    .orderBy(collections.createdAt)
    .limit(1);
  if (existing[0]) return existing[0].id;

  const [created] = await db
    .insert(collections)
    .values({ userId, name: "Saved", isDefault: true })
    .returning({ id: collections.id });
  return created!.id;
}

/** Replace the user's interest tags (restricted to the known taxonomy) and mark onboarded. */
export async function setUserInterests(
  userId: string,
  slugs: string[],
): Promise<void> {
  const db = getDb();
  const known = [...new Set(slugs.filter(isKnownTag))];
  const tagRows = known.length
    ? await db
        .select({ id: tags.id, slug: tags.slug })
        .from(tags)
        .where(inArray(tags.slug, known))
    : [];

  await db.delete(userInterests).where(eq(userInterests.userId, userId));
  if (tagRows.length > 0) {
    await db
      .insert(userInterests)
      .values(tagRows.map((t) => ({ userId, tagId: t.id, weight: 1 })))
      .onConflictDoNothing();
  }
  await db
    .update(users)
    .set({ onboardedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/** Persist a single interaction row. */
export async function recordInteraction(
  userId: string,
  destinationId: string,
  type: InteractionType,
  context?: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  await db.insert(interactions).values({
    userId,
    destinationId,
    type,
    context: context ?? null,
  });
}

/** Whether the user has the given destination saved. */
export async function isSaved(
  userId: string,
  destinationId: string,
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: savedDestinations.id })
    .from(savedDestinations)
    .where(
      and(
        eq(savedDestinations.userId, userId),
        eq(savedDestinations.destinationId, destinationId),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

/** The user's saved destinations, newest first. */
export async function getSavedItems(userId: string): Promise<SavedItem[]> {
  const db = getDb();
  const rows = await db.query.savedDestinations.findMany({
    where: eq(savedDestinations.userId, userId),
    orderBy: desc(savedDestinations.createdAt),
    with: { destination: { with: withTags } },
  });
  return rows.map((r) => ({
    destination: toCard(r.destination),
    savedAt: r.createdAt.toISOString(),
  }));
}

/** Recently seen destinations (deduped), newest first, with the latest action. */
export async function getHistoryItems(userId: string): Promise<HistoryItem[]> {
  const db = getDb();
  const rows = (await db.execute(sql`
    SELECT s.id AS id, s.type AS type, s.created_at AS at
    FROM (
      SELECT DISTINCT ON (i.destination_id)
        i.destination_id AS id, i.type, i.created_at
      FROM interactions i
      WHERE i.user_id = ${userId}
        AND i.type IN ('viewed', 'skipped', 'loved', 'visited', 'saved')
      ORDER BY i.destination_id, i.created_at DESC
    ) s
    ORDER BY s.created_at DESC
    LIMIT 60
  `)) as unknown as Array<{
    id: string;
    type: InteractionType;
    at: string | Date;
  }>;

  const cards = await loadCards(rows.map((r) => r.id));
  const cardById = new Map(cards.map((c) => [c.id, c]));
  return rows
    .filter((r) => cardById.has(r.id))
    .map((r) => ({
      destination: cardById.get(r.id)!,
      type: r.type,
      at: typeof r.at === "string" ? r.at : new Date(r.at).toISOString(),
    }));
}

// Tag + destination write helpers live in @wander/db so the API and the
// curation CLI share one import implementation. Re-exported here so existing
// call sites (`@/lib/db-helpers`) keep working unchanged.
export {
  ensureTags,
  setDestinationTags,
  upsertDestinationWithTags,
} from "@wander/db";
