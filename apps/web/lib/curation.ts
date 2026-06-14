/**
 * Server-side data access for the curation review surface. The discovery /
 * enrichment work happens out of band (the `pnpm curate` CLI or a worker);
 * these helpers only read the candidate store and bridge approvals into the
 * existing destination import path.
 */

import {
  getDb,
  schema,
  upsertDestinationWithTags,
  type CurationCandidateRow,
} from "@wander/db";
import {
  CURATION_CANDIDATE_STATUSES,
  candidateToDestinationInput,
  type ApproveCandidateInput,
  type CurationCandidateDTO,
  type CurationCandidateStatus,
  type CurationRunDTO,
  type DestinationInput,
  type StartCurationRunInput,
} from "@wander/shared";
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

const { curationCandidates, curationRuns, catalogImports } = schema;

/* ── DTO mappers ───────────────────────────────────────────────────────── */

export function toCandidateDTO(
  row: CurationCandidateRow,
): CurationCandidateDTO {
  return {
    id: row.id,
    url: row.url,
    domain: row.domain,
    sourceId: row.sourceId,
    runId: row.runId,
    status: row.status,
    qualityScore: row.qualityScore,
    rejectReason: row.rejectReason,
    destinationId: row.destinationId,
    raw: row.raw ?? {},
    enriched: row.enriched ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRunDTO(row: typeof curationRuns.$inferSelect): CurationRunDTO {
  return {
    id: row.id,
    status: row.status,
    sources: row.sources ?? [],
    discovered: row.discovered,
    enriched: row.enriched,
    accepted: row.accepted,
    rejected: row.rejected,
    imported: row.imported,
    notes: row.notes,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
  };
}

/* ── Candidates ────────────────────────────────────────────────────────── */

/** List/filter candidates for review, with per-status counts. */
export async function listCandidates(opts: {
  status?: string | null;
  q?: string | null;
  sourceId?: string | null;
  minQuality?: number | null;
  limit?: number;
}): Promise<{ items: CurationCandidateDTO[]; counts: Record<string, number> }> {
  const db = getDb();
  const conditions: SQL[] = [];

  if (
    opts.status &&
    (CURATION_CANDIDATE_STATUSES as readonly string[]).includes(opts.status)
  ) {
    conditions.push(
      eq(curationCandidates.status, opts.status as CurationCandidateStatus),
    );
  }
  if (opts.sourceId) {
    conditions.push(eq(curationCandidates.sourceId, opts.sourceId));
  }
  if (typeof opts.minQuality === "number") {
    conditions.push(gte(curationCandidates.qualityScore, opts.minQuality));
  }
  const q = opts.q?.trim();
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      or(
        ilike(curationCandidates.url, like),
        ilike(curationCandidates.domain, like),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(curationCandidates)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      desc(curationCandidates.qualityScore),
      desc(curationCandidates.updatedAt),
    )
    .limit(Math.min(opts.limit ?? 100, 200));

  const countRows = await db
    .select({
      status: curationCandidates.status,
      count: sql<number>`count(*)::int`,
    })
    .from(curationCandidates)
    .groupBy(curationCandidates.status);

  return {
    items: rows.map(toCandidateDTO),
    counts: Object.fromEntries(countRows.map((c) => [c.status, c.count])),
  };
}

export async function getCandidate(
  id: string,
): Promise<CurationCandidateDTO | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(curationCandidates)
    .where(eq(curationCandidates.id, id))
    .limit(1);
  return row ? toCandidateDTO(row) : null;
}

/**
 * Approve one candidate: map → DestinationInput (status `approved`), import via
 * the EXISTING upsert path, mark the candidate `imported`, and return the new
 * destination id. Does not write the audit row (the route batches that so a
 * bulk approve records a single import).
 */
export async function approveCandidate(
  id: string,
  overrides?: ApproveCandidateInput["overrides"],
): Promise<{ destinationId: string; created: boolean } | null> {
  const db = getDb();
  const candidate = await getCandidate(id);
  if (!candidate) return null;

  const base = candidateToDestinationInput(
    {
      url: candidate.url,
      qualityScore: candidate.qualityScore,
      enriched: candidate.enriched,
    },
    "approved",
  );
  const input: DestinationInput = {
    ...base,
    ...(overrides ?? {}),
    status: "approved",
  };

  const { id: destinationId, created } = await upsertDestinationWithTags(input);

  await db
    .update(curationCandidates)
    .set({ status: "imported", destinationId, updatedAt: new Date() })
    .where(eq(curationCandidates.id, id));

  return { destinationId, created };
}

export async function rejectCandidate(
  id: string,
  reason?: string,
): Promise<CurationCandidateDTO | null> {
  const db = getDb();
  const existing = await getCandidate(id);
  if (!existing) return null;
  await db
    .update(curationCandidates)
    .set({
      status: "rejected",
      rejectReason: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(curationCandidates.id, id));
  return getCandidate(id);
}

/** Approve a batch of candidates; records one `catalog_imports` audit row. */
export async function bulkApprove(
  userId: string,
  ids: string[],
): Promise<{ imported: number; created: number; skipped: number }> {
  let imported = 0;
  let created = 0;
  let skipped = 0;
  for (const id of ids) {
    const res = await approveCandidate(id);
    if (!res) {
      skipped += 1;
      continue;
    }
    imported += 1;
    if (res.created) created += 1;
  }
  if (imported > 0) {
    const db = getDb();
    await db.insert(catalogImports).values({
      source: "curation_bulk_approve",
      label: `curation bulk-approve @ ${new Date().toISOString()}`,
      total: ids.length,
      created,
      updated: imported - created,
      importedByUserId: userId,
    });
  }
  return { imported, created, skipped };
}

/* ── Runs ──────────────────────────────────────────────────────────────── */

/**
 * Record a run the CLI/worker will execute out of band. We do not run the
 * discovery pipeline inside a request handler (plan §7/§10): this creates a
 * `pending` run row that the engine picks up / reports against.
 */
export async function createRun(
  userId: string,
  input: StartCurationRunInput,
): Promise<CurationRunDTO> {
  const db = getDb();
  const [row] = await db
    .insert(curationRuns)
    .values({
      startedByUserId: userId,
      sources: input.sources ?? [],
      status: "pending",
      notes: input.notes ?? null,
    })
    .returning();
  return toRunDTO(row!);
}

export async function getRun(id: string): Promise<CurationRunDTO | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(curationRuns)
    .where(eq(curationRuns.id, id))
    .limit(1);
  return row ? toRunDTO(row) : null;
}
