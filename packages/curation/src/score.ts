/**
 * Quality score v0 (plan §6.5). Transparent, inspectable 0–100: a weighted sum
 * of normalized signals minus a spam penalty. Weights come from config so they
 * can be tuned without code changes. A manual override (reviewer edit) always
 * wins downstream, so this is only the engine's prior.
 */

import type { ScoringWeights } from "./config";

/** Reputation of a source, 0..1 — curated hubs beat raw search. */
export function sourceReputation(sourceId: string): number {
  const id = sourceId.toLowerCase();
  if (id.startsWith("exa-similar")) return 0.85;
  if (id.startsWith("arena") || id.startsWith("github-awesome")) return 0.8;
  if (id.startsWith("showcase")) return 0.8;
  if (id.startsWith("exa")) return 0.72;
  if (id.startsWith("hn")) return 0.65;
  if (id.startsWith("feeds")) return 0.6;
  if (id.startsWith("browserbase")) return 0.6;
  if (id.startsWith("mock")) return 0.7;
  return 0.5;
}

export interface ScoreSignals {
  sourceId: string;
  hasRealImage: boolean;
  /** Visible word count, used as a content-depth proxy. */
  wordCount: number;
  /** Enrichment model's confidence the site is a keeper, 0..1. */
  aiQualityRating: number;
  /** 0..1 evergreen-ness; evergreen content is preferred. */
  evergreen: number;
  /** 0..1 spam intensity from the safety gate. */
  spamSignals: number;
}

export function qualityScore(
  signals: ScoreSignals,
  weights: ScoringWeights,
): number {
  // Content depth saturates around ~800 words so a long page isn't unbounded.
  const depth = Math.min(1, signals.wordCount / 800);

  const positive =
    weights.sourceReputation * sourceReputation(signals.sourceId) +
    weights.hasRealImage * (signals.hasRealImage ? 1 : 0) +
    weights.contentDepth * depth +
    weights.aiQualityRating * clamp01(signals.aiQualityRating) +
    weights.freshnessOrEvergreen * clamp01(signals.evergreen);

  const positiveMax =
    weights.sourceReputation +
    weights.hasRealImage +
    weights.contentDepth +
    weights.aiQualityRating +
    weights.freshnessOrEvergreen;

  const normalized = positiveMax > 0 ? positive / positiveMax : 0;
  const penalty = (weights.spamPenalty / 100) * clamp01(signals.spamSignals);

  const score = Math.round((normalized - penalty) * 100);
  return Math.max(0, Math.min(100, score));
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
