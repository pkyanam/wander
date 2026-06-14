/**
 * Exa neural search — the breadth lever for discovery. Fast lane: returns
 * candidate URLs via API, no browser. Skipped (with a log line) when EXA_API_KEY
 * is absent.
 */

import { hasExa } from "../config";
import type { Source } from "../types";
import { fetchWithTimeout } from "../util";

const QUERIES = [
  "interactive explorable essay",
  "generative art playground",
  "personal site digital garden",
  "delightful interactive web toy",
  "indie web browser game",
  "beautiful data visualization project",
];

interface ExaResult {
  url: string;
  title?: string;
}

export const exaSearchSource: Source = {
  id: "exa-search",
  kind: "search",
  available: (ctx) => hasExa(ctx.config),
  async *discover(ctx) {
    const perQuery = Math.max(5, Math.ceil(ctx.limit / QUERIES.length));
    for (const query of QUERIES) {
      const res = await fetchWithTimeout(
        "https://api.exa.ai/search",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": ctx.config.exaApiKey!,
          },
          body: JSON.stringify({
            query,
            numResults: perQuery,
            type: "neural",
            category: "personal site",
          }),
        },
        ctx.config.fetchTimeoutMs,
      );
      if (!res || !res.ok) {
        ctx.log(`exa-search: query failed (${res?.status ?? "n/a"}): ${query}`);
        continue;
      }
      try {
        const json = (await res.json()) as { results?: ExaResult[] };
        for (const r of json.results ?? []) {
          if (!r.url) continue;
          yield {
            url: r.url,
            sourceId: "exa-search",
            rawTitle: r.title,
            discoveredVia: `exa:${query}`,
          };
        }
      } catch (e) {
        ctx.log(`exa-search: parse failed: ${String(e)}`);
      }
    }
  },
};
