"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DestinationCard } from "@wander/shared";
import { ArrowLeftIcon, BookmarkIcon, ExternalIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { api } from "@/lib/client";
import { faviconUrl } from "@/lib/utils";

export function Viewer({
  card,
  initiallySaved,
}: {
  card: DestinationCard;
  initiallySaved: boolean;
}) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [saved, setSaved] = useState(initiallySaved);
  const recorded = useRef(false);

  // Opening the viewer counts as a visit (covers Saved/History entry points too).
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    api.interact(card.id, "visited").catch(() => {});
  }, [card.id]);

  // Heuristic embed-failure fallback: if it never loads, offer the new tab.
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setBlocked(true), 4000);
    return () => clearTimeout(t);
  }, [loaded]);

  async function toggleSave() {
    const willSave = !saved;
    setSaved(willSave);
    try {
      if (willSave) await api.save(card.id);
      else await api.unsave(card.id);
    } catch {
      setSaved(!willSave);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
        >
          <ArrowLeftIcon size={20} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faviconUrl(card.domain, 64)}
            alt=""
            width={22}
            height={22}
            className="h-5 w-5 shrink-0 rounded"
          />
          <div className="min-w-0">
            <div className="truncate font-medium leading-tight text-ink">
              {card.title}
            </div>
            <div className="truncate text-xs text-ink-faint">{card.domain}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleSave}
          aria-label={saved ? "Remove from saved" : "Save"}
          className={
            saved
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
          }
        >
          <BookmarkIcon size={19} filled={saved} />
        </button>

        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("primary", "sm")}
        >
          <ExternalIcon size={16} />
          <span className="hidden sm:inline">Open</span>
        </a>
      </div>

      <div className="relative mt-4 h-[72vh] overflow-hidden rounded-card border border-line bg-paper-raised shadow-card">
        <iframe
          src={card.url}
          title={card.title}
          className="h-full w-full"
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
        />
        {blocked && !loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-paper-raised px-6 text-center">
            <p className="max-w-sm text-ink-soft">
              <span className="font-medium text-ink">{card.domain}</span>{" "}
              can&rsquo;t be shown inside Wander. Open it in a new tab to
              explore.
            </p>
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("primary", "md")}
            >
              <ExternalIcon size={17} />
              Open {card.domain}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
