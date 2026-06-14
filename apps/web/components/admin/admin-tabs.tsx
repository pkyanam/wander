"use client";

import { useState } from "react";
import type { AdminListResult, CandidateListResult } from "@/lib/client";
import { cn } from "@/lib/utils";
import { AdminCatalog } from "./admin-catalog";
import { AdminCandidates } from "./admin-candidates";

const TABS = [
  { id: "catalog", label: "Catalog" },
  { id: "candidates", label: "Candidates" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminTabs({
  catalog,
  candidates,
}: {
  catalog: AdminListResult;
  candidates: CandidateListResult;
}) {
  const [tab, setTab] = useState<TabId>("catalog");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-ink bg-ink text-paper"
                : "border-line-strong bg-paper-raised text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "catalog" ? (
          <AdminCatalog initial={catalog} />
        ) : (
          <AdminCandidates initial={candidates} />
        )}
      </div>
    </div>
  );
}
