/**
 * Hacker News via the Algolia API — high-score, evergreen Show HN / tools /
 * essays. Public, no key. We bias toward Show HN and points, and drop obvious
 * news domains (the safety gate is the backstop).
 */

import { getDomain } from "@wander/shared";
import type { Source } from "../types";
import { fetchWithTimeout } from "../util";

const NEWS_DOMAINS = new Set([
  "nytimes.com",
  "washingtonpost.com",
  "bloomberg.com",
  "cnn.com",
  "bbc.com",
  "reuters.com",
  "theguardian.com",
]);

interface Hit {
  url?: string;
  title?: string;
  points?: number;
}

export const hnAlgoliaSource: Source = {
  id: "hn-algolia",
  kind: "api",
  available: () => true,
  async *discover(ctx) {
    const res = await fetchWithTimeout(
      `https://hn.algolia.com/api/v1/search?tags=show_hn&numericFilters=points%3E120&hitsPerPage=${Math.min(
        ctx.limit,
        100,
      )}`,
      {
        headers: { accept: "application/json", "user-agent": "WanderBot/0.1" },
      },
      ctx.config.fetchTimeoutMs,
    );
    if (!res || !res.ok) {
      ctx.log(`hn-algolia: search failed (${res?.status ?? "n/a"})`);
      return;
    }
    try {
      const json = (await res.json()) as { hits?: Hit[] };
      let emitted = 0;
      for (const hit of json.hits ?? []) {
        if (emitted >= ctx.limit) break;
        if (!hit.url) continue;
        if (NEWS_DOMAINS.has(getDomain(hit.url))) continue;
        emitted += 1;
        yield {
          url: hit.url,
          sourceId: "hn-algolia",
          rawTitle: hit.title,
          hintScore: hit.points,
          discoveredVia: "hn:show_hn",
        };
      }
    } catch (e) {
      ctx.log(`hn-algolia: parse failed: ${String(e)}`);
    }
  },
};
