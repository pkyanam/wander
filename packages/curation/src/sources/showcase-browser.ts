/**
 * Browser-lane adapter (plan §6.3 / Phase 3) for JS-rendered design galleries
 * (Awwwards / SiteInspire / Godly) that need scroll/interaction. The intended
 * design is a CODIFIED Stagehand extractor (built once with observe/extract,
 * then replayed deterministically) running on a Browserbase Session — NOT a
 * model free-driving the page (slow + expensive).
 *
 * Only available with Browserbase credentials. We deliberately do not ship a
 * live model-driven extractor here; until a codified script is recorded this
 * yields nothing (a clear log line), leaving the fast lanes to do the work.
 */

import { hasBrowserbase } from "../config";
import type { Source } from "../types";

export const showcaseBrowserSource: Source = {
  id: "showcase-browser",
  kind: "browser",
  available: (ctx) => hasBrowserbase(ctx.config),
  async *discover(ctx) {
    ctx.log(
      "showcase-browser: Browserbase Sessions available, but no codified " +
        "extractor is recorded yet; skipping the browser lane this run.",
    );
    // Intentionally yields nothing. A recorded Stagehand extractor would push
    // gallery URLs here, with in-session screenshots captured during fetch.
    return;
  },
};
