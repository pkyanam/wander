/**
 * Candidate + run persistence. Candidates are upserted by canonical URL so
 * re-runs are idempotent. Imports (only via --auto-approve or the admin UI)
 * reuse the single `upsertDestinationWithTags` write path — there is no parallel
 * ingestion logic here.
 */

import { getDb, schema } from "@wander/db";
import type {
  CandidateEnrichment,
  CandidateRaw,
  CurationCandidateStatus,
} from "@wander/shared";
import { eq } from "drizzle-orm";

const { curationRuns, curationCandidates, catalogImports } = schema;

export interface RunCounts {
  discovered: number;
  enriched: number;
  accepted: number;
  rejected: number;
  imported: number;
}

export async function createRunRow(
  sources: string[],
  notes?: string,
): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(curationRuns)
    .values({ sources, status: "running", notes: notes ?? null })
    .returning({ id: curationRuns.id });
  return row!.id;
}

export async function finishRunRow(
  id: string,
  status: "completed" | "failed",
  counts: RunCounts,
): Promise<void> {
  const db = getDb();
  await db
    .update(curationRuns)
    .set({ status, ...counts, finishedAt: new Date() })
    .where(eq(curationRuns.id, id));
}

export interface CandidateRecord {
  url: string;
  domain: string;
  sourceId: string;
  runId?: string | null;
  raw: CandidateRaw;
  enriched: CandidateEnrichment | null;
  qualityScore: number;
  status: CurationCandidateStatus;
  rejectReason?: string | null;
}

/** Upsert a candidate by canonical URL; returns its id. */
export async function upsertCandidate(rec: CandidateRecord): Promise<string> {
  const db = getDb();
  const values = {
    url: rec.url,
    domain: rec.domain,
    sourceId: rec.sourceId,
    runId: rec.runId ?? null,
    raw: rec.raw,
    enriched: rec.enriched,
    qualityScore: rec.qualityScore,
    status: rec.status,
    rejectReason: rec.rejectReason ?? null,
  };
  const [row] = await db
    .insert(curationCandidates)
    .values(values)
    .onConflictDoUpdate({
      target: curationCandidates.url,
      set: { ...values, updatedAt: new Date() },
    })
    .returning({ id: curationCandidates.id });
  return row!.id;
}

export async function markImported(
  candidateId: string,
  destinationId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(curationCandidates)
    .set({ status: "imported", destinationId, updatedAt: new Date() })
    .where(eq(curationCandidates.id, candidateId));
}

/** Record one audit row for an auto-approve batch (mirrors the admin import). */
export async function writeImportAudit(
  total: number,
  created: number,
): Promise<void> {
  if (total <= 0) return;
  const db = getDb();
  await db.insert(catalogImports).values({
    source: "curation_auto_approve",
    label: `curation auto-approve @ ${new Date().toISOString()}`,
    total,
    created,
    updated: total - created,
  });
}
