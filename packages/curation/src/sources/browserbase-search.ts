/**
 * Browserbase Search API — web search built for agents. Fast lane, no browser
 * session. Best-effort: the endpoint shape may evolve, so any failure just logs
 * and yields nothing. Skipped without Browserbase credentials.
 */

import { hasBrowserbase } from "../config";
import type { Source } from "../types";
import { fetchWithTimeout } from "../util";

const QUERIES = [
  "creative coding playground",
  "explorable explanation interactive",
  "personal homepage indie web",
  "weird delightful website",
];

interface BBResult {
  url?: string;
  link?: string;
  title?: string;
}

export const browserbaseSearchSource: Source = {
  id: "browserbase-search",
  kind: "search",
  available: (ctx) => hasBrowserbase(ctx.config),
  async *discover(ctx) {
    const perQuery = Math.max(5, Math.ceil(ctx.limit / QUERIES.length));
    for (const query of QUERIES) {
      const res = await fetchWithTimeout(
        "https://api.browserbase.com/v1/search",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-bb-api-key": ctx.config.browserbaseApiKey!,
          },
          body: JSON.stringify({
            query,
            projectId: ctx.config.browserbaseProjectId,
            limit: perQuery,
          }),
        },
        ctx.config.fetchTimeoutMs,
      );
      if (!res || !res.ok) {
        ctx.log(
          `browserbase-search: query failed (${res?.status ?? "n/a"}): ${query}`,
        );
        continue;
      }
      try {
        const json = (await res.json()) as { results?: BBResult[] };
        for (const r of json.results ?? []) {
          const url = r.url ?? r.link;
          if (!url) continue;
          yield {
            url,
            sourceId: "browserbase-search",
            rawTitle: r.title,
            discoveredVia: `bb:${query}`,
          };
        }
      } catch (e) {
        ctx.log(`browserbase-search: parse failed: ${String(e)}`);
      }
    }
  },
};
