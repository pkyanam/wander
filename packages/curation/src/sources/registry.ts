import type { Source } from "../types";
import { arenaSource } from "./arena";
import { browserbaseSearchSource } from "./browserbase-search";
import { exaSearchSource } from "./exa-search";
import { exaSimilarSource } from "./exa-similar";
import { feedsSource } from "./feeds";
import { githubAwesomeSource } from "./github-awesome";
import { hnAlgoliaSource } from "./hn-algolia";
import { mockSource } from "./mock";
import { showcaseBrowserSource } from "./showcase-browser";

export const SOURCES: Record<string, Source> = {
  mock: mockSource,
  "browserbase-search": browserbaseSearchSource,
  "exa-search": exaSearchSource,
  "exa-similar": exaSimilarSource,
  "github-awesome": githubAwesomeSource,
  arena: arenaSource,
  "hn-algolia": hnAlgoliaSource,
  feeds: feedsSource,
  "showcase-browser": showcaseBrowserSource,
};

// Default run: API-first sources that need no key plus the keyed search lanes
// (which self-skip when their key is absent). `mock` and the browser lane are
// opt-in via --sources.
export const DEFAULT_SOURCES = [
  "exa-similar",
  "exa-search",
  "browserbase-search",
  "github-awesome",
  "arena",
  "hn-algolia",
  "feeds",
];

/** Resolve source ids → adapters, warning on unknown ids. */
export function resolveSources(
  names: string[] | undefined,
  warn: (msg: string) => void,
): Source[] {
  const ids = names && names.length > 0 ? names : DEFAULT_SOURCES;
  const out: Source[] = [];
  for (const id of ids) {
    const source = SOURCES[id];
    if (!source) {
      warn(`unknown source "${id}" (have: ${Object.keys(SOURCES).join(", ")})`);
      continue;
    }
    out.push(source);
  }
  return out;
}
