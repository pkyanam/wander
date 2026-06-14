/**
 * The pipeline wires the stages together (plan §5): discover → frontier →
 * fetch → enrich → score + safety → store. Ordering is cheap-before-expensive
 * and parallelism is bounded. Everything lands as `needs_review`; only the
 * (default-off) --auto-approve path creates approved destinations.
 */

import { resolveImage, upsertDestinationWithTags } from "@wander/db";
import {
  candidateToDestinationInput,
  type CandidateEnrichment,
  type CandidateRaw,
} from "@wander/shared";
import { hasExa, hasModel, loadConfig } from "./config";
import { enrichBatch, type EnrichContext } from "./enrich";
import { fetchPage } from "./fetch";
import { Frontier } from "./frontier";
import { extractMeta, type PageMeta } from "./meta";
import { isFetchAllowed } from "./robots";
import { qualityScore } from "./score";
import { evaluateSafety } from "./safety";
import {
  createRunRow,
  finishRunRow,
  markImported,
  upsertCandidate,
  writeImportAudit,
  type RunCounts,
} from "./store";
import { mockSource } from "./sources/mock";
import { resolveSources } from "./sources/registry";
import type { Logger, RawCandidate, SourceContext } from "./types";
import { pooled } from "./util";

export interface RunOptions {
  sources?: string[];
  limit: number;
  concurrency: number;
  dryRun: boolean;
  mock: boolean;
  autoApprove: boolean;
  notes?: string;
  log: Logger;
}

export interface RunSummary extends RunCounts {
  runId: string | null;
}

// Auto-approve only fires for trusted sources above a high score, and only when
// explicitly enabled. The human gate is the default.
const AUTO_APPROVE_MIN_SCORE = 80;
const AUTO_APPROVE_SOURCES = new Set([
  "exa-similar",
  "arena",
  "github-awesome",
  "mock",
]);

interface Admitted {
  raw: RawCandidate;
  url: string;
  domain: string;
}

interface Fetched extends Admitted {
  meta?: PageMeta;
  imageUrl: string | null;
}

function toRaw(raw: RawCandidate): CandidateRaw {
  return {
    rawTitle: raw.rawTitle,
    rawTags: raw.rawTags,
    hintScore: raw.hintScore,
    discoveredVia: raw.discoveredVia,
  };
}

export async function runCuration(opts: RunOptions): Promise<RunSummary> {
  const { log } = opts;
  const config = loadConfig();
  const counts: RunCounts = {
    discovered: 0,
    enriched: 0,
    accepted: 0,
    rejected: 0,
    imported: 0,
  };

  // 1. Choose sources. --mock forces the offline fixture source.
  const candidateSources = opts.mock
    ? [mockSource]
    : resolveSources(opts.sources, (m) => log(`warn: ${m}`));
  const activeSources = candidateSources.filter((s) => {
    const ctx: SourceContext = {
      limit: opts.limit,
      mock: opts.mock,
      config,
      log,
    };
    if (s.available(ctx)) return true;
    log(`source ${s.id}: unavailable (missing key/config); skipping`);
    return false;
  });

  log(
    `config: model=${hasModel(config) ? "on" : "heuristic"} exa=${
      hasExa(config) ? "on" : "off"
    } per-domain-cap=${config.perDomainCap}${opts.mock ? " [MOCK]" : ""}`,
  );
  log(`sources: ${activeSources.map((s) => s.id).join(", ") || "(none)"}`);

  // 2. Frontier (dedup vs candidates + live destinations, per-domain caps).
  const frontier = await Frontier.create(config.perDomainCap);

  // 3. Discover + admit up to the limit.
  const admitted: Admitted[] = [];
  for (const source of activeSources) {
    if (admitted.length >= opts.limit) break;
    const ctx: SourceContext = {
      limit: opts.limit - admitted.length,
      mock: opts.mock,
      config,
      log,
    };
    try {
      for await (const raw of source.discover(ctx)) {
        const res = frontier.admit(raw.url);
        if (!res) continue;
        admitted.push({ raw, url: res.url, domain: res.domain });
        if (admitted.length >= opts.limit) break;
      }
    } catch (e) {
      log(`source ${source.id}: errored (${String(e)})`);
    }
  }
  counts.discovered = admitted.length;
  log(`discovered ${admitted.length} new candidate(s) after dedup`);

  const runId = opts.dryRun
    ? null
    : await createRunRow(
        activeSources.map((s) => s.id),
        opts.notes,
      );

  try {
    // 4. Fetch + image (network), bounded + cheap-first. Skipped in mock.
    const fetched: Fetched[] = await pooled(
      admitted,
      opts.concurrency,
      async (item): Promise<Fetched> => {
        if (opts.mock) return { ...item, imageUrl: null };
        const allowed = await isFetchAllowed(item.url, config.fetchTimeoutMs);
        if (!allowed) {
          log(`robots: disallowed, skipping fetch for ${item.url}`);
          return { ...item, imageUrl: null };
        }
        const page = await fetchPage(item.url, config);
        const meta = page.html ? extractMeta(page.html) : undefined;
        const { imageUrl } = await resolveImage(item.url, {
          timeoutMs: config.fetchTimeoutMs,
        });
        return { ...item, meta, imageUrl };
      },
    );

    // 5. Enrich (batched LLM when configured + online, else heuristic).
    const contexts: EnrichContext[] = fetched.map((f) => ({
      url: f.url,
      domain: f.domain,
      raw: f.raw,
      meta: f.meta,
    }));
    const enrichment = await enrichBatch(contexts, config, {
      mock: opts.mock,
      log,
    });
    counts.enriched = fetched.length;

    // 6. Score + safety + store (+ optional auto-approve).
    let autoCreated = 0;
    for (const item of fetched) {
      const output = enrichment.get(item.url)!;
      const base = output.enriched;
      const text = `${base.summary ?? ""} ${item.meta?.description ?? ""}`;
      const safety = evaluateSafety({
        domain: item.domain,
        title: base.title,
        text,
        contentFlags: base.contentFlags,
      });

      const enriched: CandidateEnrichment = {
        ...base,
        imageUrl: item.imageUrl,
        contentFlags: safety.flags,
      };

      const signals = {
        sourceId: item.raw.sourceId,
        hasRealImage: Boolean(item.imageUrl),
        wordCount: item.meta?.wordCount ?? 0,
        aiQualityRating: output.aiQualityRating,
        evergreen: 0.7,
        spamSignals: safety.spamSignals,
      };
      const score = qualityScore(signals, config.weights);

      const status = safety.ok ? "needs_review" : "rejected";
      if (safety.ok) counts.accepted += 1;
      else counts.rejected += 1;

      if (opts.dryRun) continue;

      const candidateId = await upsertCandidate({
        url: item.url,
        domain: item.domain,
        sourceId: item.raw.sourceId,
        runId,
        raw: toRaw(item.raw),
        enriched,
        qualityScore: score,
        status,
        rejectReason: safety.ok ? null : safety.reason,
      });

      const eligible =
        opts.autoApprove &&
        status === "needs_review" &&
        score >= AUTO_APPROVE_MIN_SCORE &&
        AUTO_APPROVE_SOURCES.has(item.raw.sourceId);
      if (eligible) {
        const input = candidateToDestinationInput(
          { url: item.url, qualityScore: score, enriched },
          "approved",
        );
        const { id, created } = await upsertDestinationWithTags(input);
        await markImported(candidateId, id);
        counts.imported += 1;
        if (created) autoCreated += 1;
      }
    }

    if (!opts.dryRun && counts.imported > 0) {
      await writeImportAudit(counts.imported, autoCreated);
    }
    if (runId) await finishRunRow(runId, "completed", counts);
  } catch (e) {
    if (runId) await finishRunRow(runId, "failed", counts);
    throw e;
  }

  return { runId, ...counts };
}
