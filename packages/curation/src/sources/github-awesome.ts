/**
 * Parses `awesome-*` list READMEs (creative coding, indie web, design) via the
 * GitHub API. Public, so it runs without a key; honors GITHUB_TOKEN for higher
 * rate limits. Markdown link extraction is deterministic (no model).
 */

import type { RawCandidate, Source } from "../types";
import { fetchWithTimeout } from "../util";

const REPOS = [
  "terkelg/awesome-creative-coding",
  "joshbuchea/HEAD",
  "sw-yx/spark-joy",
];

// [label](https://example.com) — capture markdown links to external http(s) URLs.
const LINK_RE = /\[([^\]]{2,120})\]\((https?:\/\/[^)\s]+)\)/g;

const SKIP_HOSTS = [
  "github.com",
  "githubusercontent.com",
  "youtube.com",
  "twitter.com",
];

export const githubAwesomeSource: Source = {
  id: "github-awesome",
  kind: "api",
  available: () => true,
  async *discover(ctx) {
    let emitted = 0;
    for (const repo of REPOS) {
      if (emitted >= ctx.limit) break;
      const res = await fetchWithTimeout(
        `https://api.github.com/repos/${repo}/readme`,
        {
          headers: {
            accept: "application/vnd.github.raw+json",
            "user-agent": "WanderBot/0.1",
            ...(ctx.config.githubToken
              ? { authorization: `Bearer ${ctx.config.githubToken}` }
              : {}),
          },
        },
        ctx.config.fetchTimeoutMs,
      );
      if (!res || !res.ok) {
        ctx.log(`github-awesome: ${repo} failed (${res?.status ?? "n/a"})`);
        continue;
      }
      const markdown = await res.text().catch(() => "");
      for (const match of markdown.matchAll(LINK_RE)) {
        if (emitted >= ctx.limit) break;
        const [, label, url] = match;
        if (!url || SKIP_HOSTS.some((h) => url.includes(h))) continue;
        emitted += 1;
        const candidate: RawCandidate = {
          url,
          sourceId: "github-awesome",
          rawTitle: label,
          discoveredVia: `awesome:${repo}`,
        };
        yield candidate;
      }
    }
  },
};
