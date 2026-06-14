"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HistoryItem, InteractionType } from "@wander/shared";
import { DestinationRow } from "@/components/destination-row";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { ClockIcon } from "@/components/icons";
import { getHistory } from "@/lib/local-store";
import { timeAgo } from "@/lib/utils";

const VERB: Record<InteractionType, string> = {
  viewed: "Seen",
  loved: "Loved",
  skipped: "Skipped",
  saved: "Saved",
  unsaved: "Removed",
  visited: "Visited",
  reported: "Reported",
};

export function HistoryList() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(getHistory());
    setReady(true);
  }, []);

  if (!ready) return null;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ClockIcon size={26} />}
        title="No history yet"
        message="Once you start wandering, the places you see will be listed here."
        action={
          <Link href="/wander" className={buttonClasses("primary", "md")}>
            Start wandering
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <DestinationRow
          key={item.destination.id}
          card={item.destination}
          href={`/visit/${item.destination.id}`}
          meta={
            <span className="whitespace-nowrap">
              · {VERB[item.type]} {timeAgo(item.at)}
            </span>
          }
        />
      ))}
    </div>
  );
}
