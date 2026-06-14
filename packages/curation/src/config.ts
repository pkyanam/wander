/**
 * Engine configuration, read from the environment. Everything is optional: the
 * engine runs with zero provider keys (adapters that need one are skipped). The
 * scoring weights live here so they can be tuned without touching the scorer
 * (plan §6.5 / §11).
 */

export interface ScoringWeights {
  sourceReputation: number;
  hasRealImage: number;
  contentDepth: number;
  aiQualityRating: number;
  freshnessOrEvergreen: number;
  spamPenalty: number;
}

export interface CurationConfig {
  browserbaseApiKey?: string;
  browserbaseProjectId?: string;
  browserbaseMaxConcurrency: number;
  exaApiKey?: string;
  githubToken?: string;
  model?: string;
  modelApiKey?: string;
  modelBaseUrl: string;
  perDomainCap: number;
  fetchTimeoutMs: number;
  weights: ScoringWeights;
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(): CurationConfig {
  const env = process.env;
  return {
    browserbaseApiKey: env.BROWSERBASE_API_KEY || undefined,
    browserbaseProjectId: env.BROWSERBASE_PROJECT_ID || undefined,
    browserbaseMaxConcurrency: num(env.BROWSERBASE_MAX_CONCURRENCY, 20),
    exaApiKey: env.EXA_API_KEY || undefined,
    githubToken: env.GITHUB_TOKEN || undefined,
    model: env.CURATION_MODEL || undefined,
    modelApiKey: env.CURATION_MODEL_API_KEY || undefined,
    // OpenAI-compatible chat-completions endpoint; override for other gateways.
    // Strip any trailing slash so we don't build "…/v1//chat/completions".
    modelBaseUrl: (
      env.CURATION_MODEL_BASE_URL || "https://api.openai.com/v1"
    ).replace(/\/+$/, ""),
    perDomainCap: num(env.CURATION_PER_DOMAIN_CAP, 3),
    fetchTimeoutMs: num(env.CURATION_FETCH_TIMEOUT_MS, 8000),
    // Weights sum is normalized at scoring time, so these are relative.
    weights: {
      sourceReputation: 22,
      hasRealImage: 14,
      contentDepth: 18,
      aiQualityRating: 30,
      freshnessOrEvergreen: 16,
      spamPenalty: 25,
    },
  };
}

export function hasBrowserbase(c: CurationConfig): boolean {
  return Boolean(c.browserbaseApiKey && c.browserbaseProjectId);
}

export function hasExa(c: CurationConfig): boolean {
  return Boolean(c.exaApiKey);
}

export function hasModel(c: CurationConfig): boolean {
  return Boolean(c.model && c.modelApiKey);
}
