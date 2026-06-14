import { getDb } from "@wander/db";
import { sql } from "drizzle-orm";

/**
 * Recommendation v0 (PRD §9 / PLAN §7) — intentionally simple and inspectable.
 *
 * Wander is anonymous: personalization lives in the browser (localStorage), so
 * the client passes the visitor's interest tags and the ids they've already
 * seen. We score each approved destination by:
 *   quality * 0.6
 *   + matched interest-tag weight (capped)         → personalization
 *   + random jitter                                → serendipity / exploration
 *
 * We fetch a small ranked pool and let the caller drop session-excluded ids,
 * so we never bind the (potentially large) exclude set into SQL. No embeddings
 * required for v0.
 */
export async function recommendNext(opts: {
  interests?: string[];
  exclude?: string[];
  limit?: number;
}): Promise<string[]> {
  const db = getDb();
  const limit = Math.max(1, opts.limit ?? 1);
  const exclude = new Set(opts.exclude ?? []);
  // Fetch enough to survive dropping everything the visitor has already seen.
  const fetchK = Math.max(limit * 6, 25) + exclude.size;

  const interests = [...new Set(opts.interests ?? [])];
  const interestArray = interests.length
    ? sql`ARRAY[${sql.join(
        interests.map((i) => sql`${i}`),
        sql`, `,
      )}]::text[]`
    : sql`ARRAY[]::text[]`;

  const rows = (await db.execute(sql`
    WITH scored AS (
      SELECT
        d.id AS id,
        d.quality_score AS q,
        COALESCE(
          SUM(CASE WHEN t.slug = ANY(${interestArray}) THEN 1 ELSE 0 END),
          0
        ) AS interest_weight
      FROM destinations d
      LEFT JOIN destination_tags dt ON dt.destination_id = d.id
      LEFT JOIN tags t ON t.id = dt.tag_id
      WHERE d.status = 'approved'
      GROUP BY d.id, d.quality_score
    )
    SELECT id
    FROM scored
    ORDER BY (
      q * 0.6
      + LEAST(interest_weight, 6) * 14
      + random() * 18
    ) DESC
    LIMIT ${fetchK}
  `)) as unknown as Array<{ id: string }>;

  const result: string[] = [];
  for (const row of rows) {
    if (exclude.has(row.id)) continue;
    result.push(row.id);
    if (result.length >= limit) break;
  }
  return result;
}
