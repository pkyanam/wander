"use client";

import { useState } from "react";
import Link from "next/link";
import type { SavedItem } from "@wander/shared";
import { DestinationRow } from "@/components/destination-row";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { BookmarkIcon, TrashIcon } from "@/components/icons";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

export function SavedList({ initialItems }: { initialItems: SavedItem[] }) {
  const [items, setItems] = useState(initialItems);

  async function remove(id: string) {
    const prev = items;
    setItems(items.filter((i) => i.destination.id !== id));
    try {
      await api.unsave(id);
    } catch {
      setItems(prev);
    }
  }

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
