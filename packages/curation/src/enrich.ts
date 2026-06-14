/**
 * Enrichment (plan §6.4). Produces the `CandidateEnrichment` a reviewer sees:
 * hook, summary, taxonomy tags, content flags. Two paths, both validated by the
 * shared `candidateEnrichmentSchema`:
 *   - batched LLM (one call per N candidates) when a model key is configured;
 *   - a deterministic heuristic derived from page/raw metadata otherwise.
 * The image reuses `resolveImage()` from @wander/db and is resolved separately
 * by the pipeline (it's network I/O, ordered cheap-first).
 */

import {
  INTEREST_TAGS,
  candidateEnrichmentSchema,
  isKnownTag,
  type CandidateEnrichment,
} from "@wander/shared";
import { hasModel, type CurationConfig } from "./config";
import type { PageMeta } from "./meta";
import type { Logger, RawCandidate } from "./types";
import { chunk, fetchWithTimeout, truncate } from "./util";

export interface EnrichContext {
  url: string;
  domain: string;
  raw: RawCandidate;
  meta?: PageMeta;
}

export interface EnrichOutput {
  enriched: CandidateEnrichment;
  /** Model/heuristic confidence the site is a keeper, 0..1 (feeds scoring). */
  aiQualityRating: number;
}

// Keyword → taxonomy slug, used to map free-form hints/text onto the 12 tags.
const TAG_KEYWORDS: Record<string, string[]> = {
  technology: [
    "software",
    "programming",
    "developer",
    "engineering",
    "computer",
    "tech",
  ],
  design: ["design", "typography", "interface", "visual", " ux", " ui"],
  science: [
    "science",
    "physics",
    "biology",
    "chemistry",
    "astronomy",
    "research",
    "math",
  ],
  art: ["art", "illustration", "gallery", "painting", "generative", "drawing"],
  "creative-tools": [
    "playground",
    "editor",
    "maker",
    "canvas",
    "creative tool",
    "sandbox",
  ],
  productivity: ["productivity", "notes", "planning", "workflow", "organize"],
  learning: [
    "tutorial",
    "explainer",
    "course",
    "education",
    "reference",
    "learn",
  ],
  "weird-internet": ["weird", "oddity", "strange", "random", "internet gem"],
  "indie-web": [
    "personal site",
    "blog",
    "digital garden",
    "homepage",
    "indie",
    "webring",
  ],
  writing: ["essay", "fiction", "prose", "poetry", "writing", "story"],
  games: ["game", "puzzle", "arcade", "playable"],
  culture: ["culture", "music", "film", "history", "photography", "movie"],
};

/** Map free-form hints + text to the known taxonomy slugs (deduped, capped). */
export function mapTags(rawTags: string[] | undefined, text: string): string[] {
  const found = new Set<string>();
  for (const t of rawTags ?? []) {
    const slug = t.toLowerCase().trim();
    if (isKnownTag(slug)) found.add(slug);
  }
  const haystack = text.toLowerCase();
  for (const { slug } of INTEREST_TAGS) {
    if (found.has(slug)) continue;
    if (TAG_KEYWORDS[slug]?.some((kw) => haystack.includes(kw)))
      found.add(slug);
  }
  return [...found].slice(0, 8);
}

function heuristicEnrich(ctx: EnrichContext): EnrichOutput {
  const title = (ctx.meta?.title || ctx.raw.rawTitle || ctx.domain).trim();
  const description = ctx.meta?.description?.trim() ?? "";
  const hook = description
    ? truncate(description, 400)
    : truncate(`${title} — a find from ${ctx.domain}.`, 400);
  const summary = description ? truncate(description, 4000) : null;
  const tags = mapTags(ctx.raw.rawTags, `${title} ${description}`);

  // Confidence prior: a real description + some content depth reads as a keeper.
  const wordCount = ctx.meta?.wordCount ?? 0;
  const aiQualityRating = Math.min(
    1,
    0.45 + (description ? 0.2 : 0) + Math.min(0.25, wordCount / 2000),
  );

  const enriched = candidateEnrichmentSchema.parse({
    title: truncate(title, 280),
    hook,
    summary,
    tags,
    contentFlags: [],
  });
  return { enriched, aiQualityRating };
}

/* ── Batched LLM enrichment (OpenAI-compatible chat completions) ────────── */

const TAXONOMY = INTEREST_TAGS.map((t) => t.slug).join(", ");

interface LlmItem {
  url: string;
  title?: string;
  hook?: string;
  summary?: string;
  tags?: string[];
  contentFlags?: string[];
  aiQualityRating?: number;
}

function buildPrompt(items: EnrichContext[]): string {
  const lines = items.map((c, i) => {
    const desc = c.meta?.description
      ? ` — ${truncate(c.meta.description, 300)}`
      : "";
    return `${i + 1}. ${c.url} | ${c.meta?.title ?? c.raw.rawTitle ?? c.domain}${desc}`;
  });
  return [
    "You curate delightful, evergreen web destinations (personal sites, creative",
    "coding, explainers, indie tools, web games). For EACH item return JSON.",
    "",
    "For each: a punchy `hook` (<=400 chars), a `summary` (<=4000 chars), `tags`",
    `chosen ONLY from this taxonomy: [${TAXONOMY}], any `,
    "`contentFlags` (e.g. nsfw, news, paywall, affiliate) if concerning, and",
    "`aiQualityRating` (0..1) for how good a Wander find it is.",
    "",
    'Respond with ONLY a JSON object: {"items":[{"url","title","hook","summary","tags","contentFlags","aiQualityRating"}, ...]}.',
    "",
    "Items:",
    ...lines,
  ].join("\n");
}

/**
 * Parse model JSON defensively. Some providers (e.g. Claude via a gateway)
 * ignore `response_format` and wrap output in ```json fences or add prose, so
 * we strip fences and, failing that, slice the outermost object.
 */
function parseJsonLoose(content: string): unknown {
  let s = content.trim();
  const fenced = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) s = fenced[1].trim();
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(s.slice(start, end + 1));
    throw new Error("no JSON object in model response");
  }
}

async function callModel(
  items: EnrichContext[],
  config: CurationConfig,
  log: Logger,
): Promise<Map<string, EnrichOutput>> {
  const out = new Map<string, EnrichOutput>();
  const res = await fetchWithTimeout(
    `${config.modelBaseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.modelApiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: buildPrompt(items) }],
      }),
    },
    // Batched generation is slow; give the model room before falling back.
    Math.max(config.fetchTimeoutMs, 120000),
  );
  if (!res || !res.ok) {
    log(
      `enrich: model call failed (status ${res?.status ?? "n/a"}); using heuristic`,
    );
    return out;
  }
  try {
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = parseJsonLoose(content) as { items?: LlmItem[] };
    const byUrl = new Map((parsed.items ?? []).map((it) => [it.url, it]));
    for (const ctx of items) {
      const it = byUrl.get(ctx.url);
      if (!it) continue;
      const result = candidateEnrichmentSchema.safeParse({
        title: it.title || ctx.meta?.title || ctx.raw.rawTitle || ctx.domain,
        hook: it.hook ? truncate(it.hook, 400) : "",
        summary: it.summary ? truncate(it.summary, 4000) : null,
        tags: (it.tags ?? []).filter(isKnownTag).slice(0, 8),
        contentFlags: (it.contentFlags ?? []).slice(0, 12),
      });
      if (result.success) {
        out.set(ctx.url, {
          enriched: result.data,
          aiQualityRating:
            typeof it.aiQualityRating === "number" ? it.aiQualityRating : 0.6,
        });
      }
    }
  } catch (e) {
    log(`enrich: model response parse failed (${String(e)}); using heuristic`);
  }
  return out;
}

/**
 * Enrich a batch. Uses the model in chunks when configured + online; anything
 * the model doesn't cover falls back to the deterministic heuristic so every
 * candidate gets enrichment.
 */
export async function enrichBatch(
  items: EnrichContext[],
  config: CurationConfig,
  opts: { mock: boolean; log: Logger; batchSize?: number },
): Promise<Map<string, EnrichOutput>> {
  const result = new Map<string, EnrichOutput>();
  const fromModel = new Map<string, EnrichOutput>();

  if (!opts.mock && hasModel(config)) {
    for (const group of chunk(items, opts.batchSize ?? 10)) {
      const got = await callModel(group, config, opts.log);
      for (const [url, value] of got) fromModel.set(url, value);
    }
  }

  for (const ctx of items) {
    result.set(ctx.url, fromModel.get(ctx.url) ?? heuristicEnrich(ctx));
  }
  return result;
}
