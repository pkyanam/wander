/**
 * RSS + sitemap feeds of curated newsletters/directories. No key. Deterministic
 * extraction: pull <link>/<loc> URLs from the XML. Add feeds via the
 * `curation_sources` registry later; this ships a small evergreen default set.
 */

import type { Source } from "../types";
import { fetchWithTimeout } from "../util";

const FEEDS = [
  "https://kottke.org/index.xml",
  "https://www.theatlantic.com/feed/all/",
];

// RSS <link>…</link> and Atom <link href="…"/> and sitemap <loc>…</loc>.
const RSS_LINK_RE = /<link>\s*(https?:\/\/[^<\s]+)\s*<\/link>/gi;
const ATOM_LINK_RE = /<link[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*\/?>/gi;
const LOC_RE = /<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi;

export const feedsSource: Source = {
  id: "feeds",
  kind: "feed",
  available: () => true,
  async *discover(ctx) {
    let emitted = 0;
    for (const feed of FEEDS) {
      if (emitted >= ctx.limit) break;
      const res = await fetchWithTimeout(
        feed,
        {
          headers: {
            accept: "application/xml,text/xml,*/*",
            "user-agent": "WanderBot/0.1",
          },
        },
        ctx.config.fetchTimeoutMs,
      );
      if (!res || !res.ok) {
        ctx.log(`feeds: ${feed} failed (${res?.status ?? "n/a"})`);
        continue;
      }
      const xml = await res.text().catch(() => "");
      const urls = new Set<string>();
      for (const re of [RSS_LINK_RE, ATOM_LINK_RE, LOC_RE]) {
        for (const m of xml.matchAll(re)) if (m[1]) urls.add(m[1]);
      }
      for (const url of urls) {
        if (emitted >= ctx.limit) break;
        // Skip the feed's self/home link.
        if (url === feed || feed.startsWith(url)) continue;
        emitted += 1;
        yield { url, sourceId: "feeds", discoveredVia: `feed:${feed}` };
      }
    }
  },
};
