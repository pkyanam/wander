/**
 * Exa find_similar — the quality lever. Seeds from our highest-quality approved
 * destinations and asks for "more sites like this", which is the strongest way
 * to expand the catalog without lowering the bar (plan §6.1). Skipped without
 * EXA_API_KEY.
 */

import { getDb, schema } from "@wander/db";
import { desc, eq } from "drizzle-orm";
import { hasExa } from "../config";
import type { Source } from "../types";
import { fetchWithTimeout } from "../util";

interface ExaResult {
  url: string;
  title?: string;
}

async function topApprovedUrls(limit: number): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ url: schema.destinations.url })
    .from(schema.destinations)
    .where(eq(schema.destinations.status, "approved"))
    .orderBy(desc(schema.destinations.qualityScore))
    .limit(limit);
  return rows.map((r) => r.url);
}

export const exaSimilarSource: Source = {
  id: "exa-similar",
  kind: "search",
  available: (ctx) => hasExa(ctx.config),
  async *discover(ctx) {
    const seeds = await topApprovedUrls(6);
    if (seeds.length === 0) {
      ctx.log("exa-similar: no approved destinations to seed from; skipping");
      return;
    }
    const perSeed = Math.max(4, Math.ceil(ctx.limit / seeds.length));
    for (const seed of seeds) {
      const res = await fetchWithTimeout(
        "https://api.exa.ai/findSimilar",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": ctx.config.exaApiKey!,
          },
          body: JSON.stringify({ url: seed, numResults: perSeed }),
        },
        ctx.config.fetchTimeoutMs,
      );
      if (!res || !res.ok) {
        ctx.log(
          `exa-similar: failed for seed ${seed} (${res?.status ?? "n/a"})`,
        );
        continue;
      }
      try {
        const json = (await res.json()) as { results?: ExaResult[] };
        for (const r of json.results ?? []) {
          if (!r.url) continue;
          yield {
            url: r.url,
            sourceId: "exa-similar",
            rawTitle: r.title,
            hintScore: 80,
            discoveredVia: `similar:${seed}`,
          };
        }
      } catch (e) {
        ctx.log(`exa-similar: parse failed: ${String(e)}`);
      }
    }
  },
};
