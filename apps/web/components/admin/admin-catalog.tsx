"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DESTINATION_STATUSES,
  type DestinationAdmin,
  type DestinationStatus,
} from "@wander/shared";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { PlusIcon } from "@/components/icons";
import { adminApi, ApiError, type AdminListResult } from "@/lib/client";
import { cn } from "@/lib/utils";
import { DestinationDialog } from "./destination-dialog";
import { ImportDialog } from "./import-dialog";

const STATUS_STYLES: Record<DestinationStatus, string> = {
  approved: "bg-compass-soft text-compass-strong",
  needs_review: "bg-accent-soft text-accent-strong",
  draft: "bg-paper-sunken text-ink-soft",
  rejected: "bg-love-soft text-love",
  archived: "bg-paper-sunken text-ink-faint",
};

function StatusBadge({ status }: { status: DestinationStatus }) {
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

const FILTERS = ["all", ...DESTINATION_STATUSES] as const;

export function AdminCatalog({ initial }: { initial: AdminListResult }) {
  const [items, setItems] = useState(initial.items);
  const [counts, setCounts] = useState(initial.counts);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DestinationAdmin | undefined>();
  const [importOpen, setImportOpen] = useState(false);

  const refresh = useCallback(async (status: string, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.list({ status, q });
      setItems(res.items);
      setCounts(res.counts);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load catalog.");
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

  async function quickStatus(
    item: DestinationAdmin,
    status: DestinationStatus,
  ) {
    try {
      await adminApi.update(item.id, { status });
      await refresh(filter, query);
    } catch {
      /* surfaced on next load */
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
            placeholder="Search title, url, domain…"
            className="w-full rounded-pill border border-line-strong bg-paper-raised px-4 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <Button variant="secondary" size="sm" type="submit">
            Search
          </Button>
        </form>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
            Import
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            <PlusIcon size={16} />
            Add
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-love" role="alert">
          {error}
        </p>
      )}

      <div className={cn("mt-5 space-y-2.5", loading && "opacity-60")}>
        {items.length === 0 && !loading ? (
          <p className="rounded-card border border-dashed border-line-strong bg-paper-raised/50 px-6 py-12 text-center text-ink-soft">
            No destinations match.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-ink-faint">
                    q{item.qualityScore} · {item.domain}
                  </span>
                </div>
                <h3 className="mt-1 truncate font-display text-lg font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="line-clamp-1 text-sm text-ink-soft">
                  {item.hook}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.slice(0, 4).map((t) => (
                    <Tag key={t.slug}>{t.label}</Tag>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.status !== "approved" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => quickStatus(item, "approved")}
                  >
                    Approve
                  </Button>
                )}
                {item.status !== "archived" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => quickStatus(item, "archived")}
                  >
                    Archive
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(item);
                    setDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <DestinationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={() => void refresh(filter, query)}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => void refresh(filter, query)}
      />
    </div>
  );
}
