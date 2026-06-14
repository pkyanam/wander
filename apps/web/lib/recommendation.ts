import { getDb } from "@wander/db";
import { sql } from "drizzle-orm";

/**
 * Recommendation v0 (PRD §9 / PLAN §7) — intentionally simple and inspectable.
 *
 * Score per approved, not-yet-seen destination:
 *   quality * 0.6
 *   + matched interest-tag weight (capped)         → personalization
 *   + loved/saved tag affinity (capped)            → actions teach the system
 *   + random jitter                                → serendipity / exploration
 *   - skipped tag penalty (capped)                 → down-rank what you skip
 *
 * We fetch a small ranked pool and let the caller drop session-excluded ids,
 * so we never bind arrays into SQL. No embeddings required for v0.
 */
export async function recommendNext(opts: {
  userId: string;
  exclude?: string[];
  limit?: number;
}): Promise<string[]> {
  const db = getDb();
  const limit = Math.max(1, opts.limit ?? 1);
  const fetchK = Math.max(limit * 6, 25);
  const exclude = new Set(opts.exclude ?? []);

  const rows = (await db.execute(sql`
    WITH ui AS (
      SELECT tag_id, weight FROM user_interests WHERE user_id = ${opts.userId}
    ),
    loves AS (
      SELECT dt.tag_id, count(*)::float AS n
      FROM interactions i
      JOIN destination_tags dt ON dt.destination_id = i.destination_id
      WHERE i.user_id = ${opts.userId} AND i.type IN ('loved', 'saved')
      GROUP BY dt.tag_id
    ),
    skips AS (
      SELECT dt.tag_id, count(*)::float AS n
      FROM interactions i
      JOIN destination_tags dt ON dt.destination_id = i.destination_id
      WHERE i.user_id = ${opts.userId} AND i.type = 'skipped'
      GROUP BY dt.tag_id
    ),
    seen AS (
      SELECT DISTINCT destination_id FROM interactions
      WHERE user_id = ${opts.userId}
        AND type IN ('viewed', 'skipped', 'loved', 'visited')
    ),
    scored AS (
      SELECT
        d.id AS id,
        d.quality_score AS q,
        COALESCE(SUM(ui.weight), 0) AS interest_weight,
        COALESCE(SUM(loves.n), 0) AS love_weight,
        COALESCE(SUM(skips.n), 0) AS skip_weight
      FROM destinations d
      LEFT JOIN destination_tags dt ON dt.destination_id = d.id
      LEFT JOIN ui ON ui.tag_id = dt.tag_id
      LEFT JOIN loves ON loves.tag_id = dt.tag_id
      LEFT JOIN skips ON skips.tag_id = dt.tag_id
      WHERE d.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM seen WHERE seen.destination_id = d.id
        )
      GROUP BY d.id, d.quality_score
    )
    SELECT id
    FROM scored
    ORDER BY (
      q * 0.6
      + LEAST(interest_weight, 6) * 14
      + LEAST(love_weight, 8) * 8
      + random() * 18
      - LEAST(skip_weight, 8) * 6
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
