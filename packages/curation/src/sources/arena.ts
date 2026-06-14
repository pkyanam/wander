/**
 * Are.na public API — already-curated link blocks from public channels. No key
 * required. We pull Link blocks and surface their source URLs.
 */

import type { Source } from "../types";
import { fetchWithTimeout } from "../util";

const CHANNELS = ["good-internet", "tools-i-have-known", "websites-3"];

interface ArenaBlock {
  class?: string;
  source?: { url?: string };
  title?: string;
}

export const arenaSource: Source = {
  id: "arena",
  kind: "api",
  available: () => true,
  async *discover(ctx) {
    const per = Math.max(10, Math.ceil(ctx.limit / CHANNELS.length));
    let emitted = 0;
    for (const slug of CHANNELS) {
      if (emitted >= ctx.limit) break;
      const res = await fetchWithTimeout(
        `https://api.are.na/v2/channels/${slug}/contents?per=${per}`,
        {
          headers: {
            accept: "application/json",
            "user-agent": "WanderBot/0.1",
          },
        },
        ctx.config.fetchTimeoutMs,
      );
      if (!res || !res.ok) {
        ctx.log(`arena: channel ${slug} failed (${res?.status ?? "n/a"})`);
        continue;
      }
      try {
        const json = (await res.json()) as { contents?: ArenaBlock[] };
        for (const block of json.contents ?? []) {
          if (emitted >= ctx.limit) break;
          const url = block.source?.url;
          if (block.class !== "Link" || !url) continue;
          emitted += 1;
          yield {
            url,
            sourceId: "arena",
            rawTitle: block.title,
            discoveredVia: `arena:${slug}`,
          };
        }
      } catch (e) {
        ctx.log(`arena: parse failed: ${String(e)}`);
      }
    }
  },
};
