"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DestinationRow } from "@/components/destination-row";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { BookmarkIcon, TrashIcon } from "@/components/icons";
import { getSaved, removeSaved, type SavedEntry } from "@/lib/local-store";
import { timeAgo } from "@/lib/utils";

export function SavedList() {
  const [items, setItems] = useState<SavedEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(getSaved());
    setReady(true);
  }, []);

  function remove(id: string) {
    removeSaved(id);
    setItems((prev) => prev.filter((i) => i.destination.id !== id));
  }

  if (!ready) return null;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BookmarkIcon size={26} />}
        title="Nothing saved yet"
        message="Tap Save on a discovery you want to keep, and it'll appear here."
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
            <span className="whitespace-nowrap">· {timeAgo(item.savedAt)}</span>
          }
          action={
            <button
              type="button"
              onClick={() => remove(item.destination.id)}
              aria-label={`Remove ${item.destination.title} from saved`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-love-soft hover:text-love"
            >
              <TrashIcon size={18} />
            </button>
          }
        />
      ))}
    </div>
  );
}
