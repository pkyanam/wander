"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CURATION_CANDIDATE_STATUSES,
  type CurationCandidateDTO,
  type CurationCandidateStatus,
} from "@wander/shared";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Modal } from "@/components/ui/modal";
import { HeroImage } from "@/components/wander/hero-image";
import { ApiError, curationApi, type CandidateListResult } from "@/lib/client";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<CurationCandidateStatus, string> = {
  discovered: "bg-paper-sunken text-ink-soft",
  enriching: "bg-compass-soft text-compass-strong",
  needs_review: "bg-accent-soft text-accent-strong",
  rejected: "bg-love-soft text-love",
  imported: "bg-paper-sunken text-ink-faint",
};

function StatusBadge({ status }: { status: CurationCandidateStatus }) {
  return (
    <span
      className={cn(
        "rounded-pill px-2 py-0.5 text-[0.68rem] font-semibold",
        STATUS_STYLES[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

const FILTERS = ["all", ...CURATION_CANDIDATE_STATUSES] as const;

// Reviewer-actionable states: anything still pending a decision.
const ACTIONABLE: ReadonlySet<CurationCandidateStatus> = new Set([
  "needs_review",
  "discovered",
]);

const csv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function AdminCandidates({ initial }: { initial: CandidateListResult }) {
  const [items, setItems] = useState(initial.items);
  const [counts, setCounts] = useState(initial.counts);
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]>("needs_review");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [rejecting, setRejecting] = useState<
    CurationCandidateDTO | undefined
  >();
  const [editing, setEditing] = useState<CurationCandidateDTO | undefined>();

  const refresh = useCallback(async (status: string, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await curationApi.candidates({ status, q, limit: 100 });
      setItems(res.items);
      setCounts(res.counts);
      // Drop selections that are no longer present in the visible list.
      setSelected((prev) => {
        const next = new Set<string>();
        for (const item of res.items) if (prev.has(item.id)) next.add(item.id);
        return next;
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load candidates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(filter, query);
    // Re-fetch when the status filter changes (search is submitted explicitly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Only actionable candidates (still pending a decision) can be selected.
  const actionableIds = items
    .filter((c) => ACTIONABLE.has(c.status))
    .map((c) => c.id);
  const allSelected =
    actionableIds.length > 0 && actionableIds.every((id) => selected.has(id));

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        for (const id of actionableIds) next.delete(id);
        return next;
      }
      return new Set([...prev, ...actionableIds]);
    });
  }

  async function approve(id: string) {
    try {
      await curationApi.approve(id);
      await refresh(filter, query);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't approve.");
    }
  }

  async function bulkApprove() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await curationApi.bulkApprove(ids);
      setSelected(new Set());
      await refresh(filter, query);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't bulk approve.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f
                ? "border-ink bg-ink text-paper"
                : "border-line-strong bg-paper-raised text-ink-soft hover:text-ink",
            )}
          >
            {f === "all"
              ? `All (${total})`
              : `${f.replace("_", " ")} (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void refresh(filter, query);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search url, domain…"
            className="w-full rounded-pill border border-line-strong bg-paper-raised px-4 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <Button variant="secondary" size="sm" type="submit">
            Search
          </Button>
        </form>
        {actionableIds.length > 0 && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={toggleSelectAll}>
              {allSelected ? "Clear" : `Select all (${actionableIds.length})`}
            </Button>
            {selected.size > 0 && (
              <Button size="sm" onClick={() => void bulkApprove()}>
                Bulk approve ({selected.size})
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-love" role="alert">
          {error}
        </p>
      )}

      <div className={cn("mt-5 space-y-2.5", loading && "opacity-60")}>
        {items.length === 0 && !loading ? (
          <p className="rounded-card border border-dashed border-line-strong bg-paper-raised/50 px-6 py-12 text-center text-ink-soft">
            No candidates match.
          </p>
        ) : (
          items.map((c) => {
            const title = c.enriched?.title ?? c.raw.rawTitle ?? c.domain;
            const tags = c.enriched?.tags ?? [];
            const flags = c.enriched?.contentFlags ?? [];
            const actionable = ACTIONABLE.has(c.status);
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-line bg-paper-raised"
              >
                <HeroImage
                  domain={c.domain}
                  imageUrl={c.enriched?.imageUrl ?? null}
                />
                <div className="flex flex-col gap-3 p-4 sm:flex-row">
                  {actionable && (
                    <label className="flex shrink-0 items-start pt-1">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelected(c.id)}
                        className="h-4 w-4 accent-accent"
                        aria-label={`Select ${title}`}
                      />
                    </label>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      <span className="text-xs text-ink-faint">
                        q{c.qualityScore} · {c.sourceId}
                      </span>
                    </div>
                    <h3 className="mt-1 truncate font-display text-lg font-semibold text-ink">
                      {title}
                    </h3>
                    {c.enriched?.hook && (
                      <p className="line-clamp-2 text-sm text-ink-soft">
                        {c.enriched.hook}
                      </p>
                    )}
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-xs text-accent hover:text-accent-strong"
                    >
                      {c.url}
                    </a>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.slice(0, 4).map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </div>
                    )}
                    {flags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {flags.map((f) => (
                          <Tag key={f} className="border-love/40 text-love">
                            {f}
                          </Tag>
                        ))}
                      </div>
                    )}
                    {c.status === "rejected" && c.rejectReason && (
                      <p className="mt-2 text-xs text-ink-soft">
                        Rejected: {c.rejectReason}
                      </p>
                    )}
                  </div>
                  {actionable && (
                    <div className="flex shrink-0 flex-wrap items-start gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void approve(c.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(c)}
                      >
                        Edit & approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRejecting(c)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <RejectDialog
        candidate={rejecting}
        onOpenChange={(open) => {
          if (!open) setRejecting(undefined);
        }}
        onRejected={() => void refresh(filter, query)}
      />
      <EditApproveDialog
        candidate={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
        onApproved={() => void refresh(filter, query)}
      />
    </div>
  );
}

function RejectDialog({
  candidate,
  onOpenChange,
  onRejected,
}: {
  candidate?: CurationCandidateDTO;
  onOpenChange: (open: boolean) => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever a new candidate is targeted.
  useEffect(() => {
    if (!candidate) return;
    setReason("");
    setError(null);
  }, [candidate]);

  async function run() {
    if (!candidate) return;
    setSubmitting(true);
    setError(null);
    try {
      await curationApi.reject(candidate.id, reason.trim() || undefined);
      onRejected();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't reject.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={Boolean(candidate)}
      onOpenChange={onOpenChange}
      title="Reject candidate"
      description="Optionally note why this didn't make the cut."
    >
      <div className="space-y-4">
        <textarea
          rows={3}
          className="w-full resize-none rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
        />
        {error && (
          <p className="text-sm text-love" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void run()} disabled={submitting}>
            {submitting ? "Rejecting\u2026" : "Reject"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const field =
  "w-full rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";
const label =
  "block text-xs font-semibold uppercase tracking-wide text-ink-faint";

function EditApproveDialog({
  candidate,
  onOpenChange,
  onApproved,
}: {
  candidate?: CurationCandidateDTO;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [qualityScore, setQualityScore] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from the candidate's enriched fields when targeted.
  useEffect(() => {
    if (!candidate) return;
    setError(null);
    setTitle(candidate.enriched?.title ?? candidate.raw.rawTitle ?? "");
    setHook(candidate.enriched?.hook ?? "");
    setSummary(candidate.enriched?.summary ?? "");
    setTags((candidate.enriched?.tags ?? []).join(", "));
    setQualityScore(candidate.qualityScore);
  }, [candidate]);

  async function save() {
    if (!candidate) return;
    setSubmitting(true);
    setError(null);
    try {
      // "Edit" is expressed as approve overrides (see ApproveCandidateInput).
      await curationApi.approve(candidate.id, {
        title: title.trim(),
        hook: hook.trim(),
        summary: summary.trim() || null,
        tags: csv(tags),
        qualityScore,
      });
      onApproved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't approve.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={Boolean(candidate)}
      onOpenChange={onOpenChange}
      title="Edit & approve"
      description="Tweak the enriched fields before importing."
    >
      <div className="space-y-4">
        <div>
          <label className={label} htmlFor="c-title">
            Title
          </label>
          <input
            id="c-title"
            className={`${field} mt-1.5`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="c-hook">
            Hook
          </label>
          <input
            id="c-hook"
            className={`${field} mt-1.5`}
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            placeholder="One delightful sentence"
          />
        </div>
        <div>
          <label className={label} htmlFor="c-summary">
            Summary <span className="font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="c-summary"
            rows={2}
            className={`${field} mt-1.5 resize-none`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="c-tags">
            Tags{" "}
            <span className="font-normal lowercase">
              (comma separated slugs)
            </span>
          </label>
          <input
            id="c-tags"
            className={`${field} mt-1.5`}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="design, technology, weird-internet"
          />
        </div>
        <div>
          <label className={label} htmlFor="c-quality">
            Quality score: {qualityScore}
          </label>
          <input
            id="c-quality"
            type="range"
            min={0}
            max={100}
            className="mt-2 w-full accent-accent"
            value={qualityScore}
            onChange={(e) => setQualityScore(Number(e.target.value))}
          />
        </div>

        {error && (
          <p className="text-sm text-love" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={submitting || !title.trim() || !hook.trim()}
          >
            {submitting ? "Approving\u2026" : "Approve"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
