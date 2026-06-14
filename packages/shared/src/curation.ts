/**
 * The curation-engine contract shared by the engine (packages/curation), the
 * Wander API, and the admin UI. Candidates are deliberately shaped so a
 * survivor maps cleanly onto `DestinationInput` and rides the existing import
 * path — there is no parallel ingestion schema.
 */

import { z } from "zod";
import { destinationInputSchema, type DestinationInput } from "./validation";
import { getDomain } from "./url";

/* ── Lifecycle enums ───────────────────────────────────────────────────── */

/**
 * The candidate's own lifecycle inside the engine. Distinct from
 * `destinations.status`; only on import does a real destination get created.
 */
export const CURATION_CANDIDATE_STATUSES = [
  "discovered",
  "enriching",
  "needs_review",
  "rejected",
  "imported",
] as const;
export type CurationCandidateStatus =
  (typeof CURATION_CANDIDATE_STATUSES)[number];

export const CURATION_RUN_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;
export type CurationRunStatus = (typeof CURATION_RUN_STATUSES)[number];

/** Adapter kinds, mirroring the `Source.kind` field in the engine. */
export const CURATION_SOURCE_KINDS = [
  "search",
  "api",
  "feed",
  "browser",
] as const;
export type CurationSourceKind = (typeof CURATION_SOURCE_KINDS)[number];

const tagSlug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "tags must be lowercase kebab-case");

/* ── Stored JSON shapes (jsonb columns) ────────────────────────────────── */

/** Discovery-time signal from a source adapter; carries no enrichment. */
export const candidateRawSchema = z.object({
  rawTitle: z.string().max(500).optional(),
  rawTags: z.array(z.string().max(64)).max(64).optional(),
  hintScore: z.number().optional(),
  discoveredVia: z.string().max(2048).optional(),
});
export type CandidateRaw = z.infer<typeof candidateRawSchema>;

/** Enriched fields produced by the enrichment stage. */
export const candidateEnrichmentSchema = z.object({
  title: z.string().min(1).max(280),
  hook: z.string().max(400).default(""),
  summary: z.string().max(4000).nullish(),
  imageUrl: z.url().max(2048).nullish(),
  tags: z.array(tagSlug).max(24).default([]),
  contentFlags: z.array(z.string().max(64)).max(24).default([]),
  qualityNote: z.string().max(1000).optional(),
});
export type CandidateEnrichment = z.infer<typeof candidateEnrichmentSchema>;

/* ── DTOs (API ⇄ UI) ───────────────────────────────────────────────────── */

export interface CurationCandidateDTO {
  id: string;
  url: string;
  domain: string;
  sourceId: string;
  runId: string | null;
  status: CurationCandidateStatus;
  qualityScore: number;
  rejectReason: string | null;
  destinationId: string | null;
  raw: CandidateRaw;
  enriched: CandidateEnrichment | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurationRunDTO {
  id: string;
  status: CurationRunStatus;
  sources: string[];
  discovered: number;
  enriched: number;
  accepted: number;
  rejected: number;
  imported: number;
  notes: string | null;
  startedAt: string;
  finishedAt: string | null;
}

/* ── API request bodies ────────────────────────────────────────────────── */

/** POST /api/v1/admin/curation/runs — records a run the worker/CLI executes. */
export const startCurationRunSchema = z.object({
  sources: z.array(z.string().max(120)).max(32).optional(),
  limit: z.number().int().min(1).max(5000).optional(),
  notes: z.string().max(1000).optional(),
});
export type StartCurationRunInput = z.infer<typeof startCurationRunSchema>;

/** POST /api/v1/admin/curation/candidates/:id/approve */
export const approveCandidateSchema = z.object({
  // Optional last-mile edits the reviewer made before importing.
  overrides: destinationInputSchema.partial().optional(),
});
export type ApproveCandidateInput = z.infer<typeof approveCandidateSchema>;

/** POST /api/v1/admin/curation/candidates/:id/reject */
export const rejectCandidateSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type RejectCandidateInput = z.infer<typeof rejectCandidateSchema>;

/** POST /api/v1/admin/curation/candidates/bulk-approve */
export const bulkApproveCandidatesSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(500),
});
export type BulkApproveCandidatesInput = z.infer<
  typeof bulkApproveCandidatesSchema
>;

/* ── Candidate → DestinationInput mapping ──────────────────────────────── */

/**
 * Map a stored candidate to the import contract. The engine and the API both
 * call this so the shape is identical regardless of who imports. `status`
 * defaults to `needs_review`; approval passes `"approved"`.
 *
 * Throws if the candidate has no usable enrichment (no title), which would
 * fail `destinationInputSchema` anyway — callers gate on enrichment first.
 */
export function candidateToDestinationInput(
  candidate: Pick<CurationCandidateDTO, "url" | "qualityScore"> & {
    enriched: CandidateEnrichment | null;
  },
  status: "needs_review" | "approved" = "needs_review",
): DestinationInput {
  const enriched = candidate.enriched;
  const title = enriched?.title?.trim() || getDomain(candidate.url);

  return destinationInputSchema.parse({
    url: candidate.url,
    title,
    hook: enriched?.hook?.trim() || title,
    summary: enriched?.summary ?? null,
    imageUrl: enriched?.imageUrl ?? null,
    tags: enriched?.tags ?? [],
    sourceType: "api_ingestion",
    status,
    qualityScore: candidate.qualityScore,
    contentFlags: enriched?.contentFlags ?? [],
  });
}
