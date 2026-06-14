"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { DestinationCard } from "@wander/shared";
import { api, ApiError, type WanderResult } from "@/lib/client";
import {
  addSaved,
  addSeen,
  getInterests,
  getSeen,
  recordHistory,
  removeSaved,
} from "@/lib/local-store";
import { WanderCard } from "./wander-card";
import { ActionBar } from "./action-bar";
import { Button } from "@/components/ui/button";
import { CompassIcon, HeartIcon, SparklesIcon } from "@/components/icons";

type Status = "loading" | "ready" | "exhausted" | "error";
type Advance = "skip" | "love" | "report";

export function WanderDeck() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [current, setCurrent] = useState<DestinationCard | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [saved, setSaved] = useState(false);
  const [acting, setActing] = useState(false);
  const [exitDir, setExitDir] = useState<"up" | "down">("down");
  const [burst, setBurst] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seenRef = useRef<string[]>([]);
  const interestsRef = useRef<string[]>([]);
  const pendingFetch = useRef<Promise<WanderResult> | null>(null);

  const fetchCard = useCallback(async (): Promise<WanderResult> => {
    const res = await api.wander(seenRef.current, interestsRef.current);
    if (res.card) {
      seenRef.current.push(res.card.id);
      // Persist the seen id + a "viewed" history entry for the anonymous visitor.
      addSeen(res.card.id);
      recordHistory(res.card, "viewed");
    }
    return res;
  }, []);

  const loadFirst = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetchCard();
      if (res.card) {
        setCurrent(res.card);
        setSaved(false);
        setStatus("ready");
      } else {
        setStatus("exhausted");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't reach Wander.");
      setStatus("error");
    }
  }, [fetchCard]);

  useEffect(() => {
    let cancelled = false;
    // Seed personalization from localStorage before the first fetch.
    interestsRef.current = getInterests();
    seenRef.current = [...getSeen()];
    void (async () => {
      if (!cancelled) await loadFirst();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFirst]);

  function beginAdvance(kind: Advance) {
    if (!current || acting) return;
    setActing(true);
    if (kind === "love") setBurst(true);
    setExitDir(kind === "love" ? "up" : "down");
    const type =
      kind === "love" ? "loved" : kind === "report" ? "reported" : "skipped";
    recordHistory(current, type);
    pendingFetch.current = fetchCard();
    setCurrent(null); // triggers exit; next card resolves during the animation
  }

  async function onExitComplete() {
    if (!acting) return;
    setBurst(false);
    const p = pendingFetch.current;
    pendingFetch.current = null;
    try {
      const res = p ? await p : await fetchCard();
      if (res.card) {
        setCurrent(res.card);
        setSaved(false);
        setStatus("ready");
      } else {
        setStatus("exhausted");
      }
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Couldn't load the next one.",
      );
      setStatus("error");
    } finally {
      setActing(false);
    }
  }

  function onSave() {
    if (!current) return;
    const willSave = !saved;
    setSaved(willSave);
    if (willSave) {
      addSaved(current);
      recordHistory(current, "saved");
    } else {
      removeSaved(current.id);
    }
  }

  function onVisit() {
    if (!current) return;
    // The viewer records the 'visited' interaction on open.
    router.push(`/visit/${current.id}`);
  }

  // Keyboard shortcuts (desktop), reading the latest handlers via a ref.
  const handlers = { beginAdvance, onSave, onVisit };
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (e.key === "ArrowRight" || k === "j") {
        e.preventDefault();
        handlersRef.current.beginAdvance("skip");
      } else if (e.key === "ArrowUp" || k === "l") {
        e.preventDefault();
        handlersRef.current.beginAdvance("love");
      } else if (k === "s") {
        handlersRef.current.onSave();
      } else if (k === "v") {
        handlersRef.current.onVisit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (status === "loading") return <DeckSkeleton />;
  if (status === "error")
    return <ErrorState message={error} onRetry={loadFirst} />;
  if (status === "exhausted") return <ExhaustedState onRetry={loadFirst} />;

  const variants = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduce
      ? { opacity: 0 }
      : { opacity: 0, y: exitDir === "up" ? -48 : 48, scale: 0.97 },
  };

  return (
    <div>
      <div className="relative">
        <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
          {current && (
            <motion.div
              key={current.id}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <WanderCard
                card={current}
                onReport={() => beginAdvance("report")}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {burst && !reduce && (
            <motion.div
              className="pointer-events-none absolute inset-0 flex items-start justify-center pt-16 text-love"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <HeartIcon size={96} filled />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ActionBar
        saved={saved}
        acting={acting || !current}
        onSkip={() => beginAdvance("skip")}
        onLove={() => beginAdvance("love")}
        onSave={onSave}
        onVisit={onVisit}
      />

      <p className="mt-6 hidden items-center justify-center gap-3 text-xs text-ink-faint md:flex">
        <Shortcut k="→">Skip</Shortcut>
        <Shortcut k="↑">Love</Shortcut>
        <Shortcut k="S">Save</Shortcut>
        <Shortcut k="V">Visit</Shortcut>
      </p>
    </div>
  );
}

function Shortcut({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="rounded-md border border-line bg-paper-raised px-1.5 py-0.5 font-sans text-[0.7rem] text-ink-soft">
        {k}
      </kbd>
      {children}
    </span>
  );
}

function DeckSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="overflow-hidden rounded-card border border-line bg-paper-raised shadow-card">
        <div className="h-44 bg-paper-sunken sm:h-52" />
        <div className="space-y-3 p-6">
          <div className="h-7 w-3/4 rounded-md bg-paper-sunken" />
          <div className="h-4 w-full rounded bg-paper-sunken" />
          <div className="h-4 w-5/6 rounded bg-paper-sunken" />
          <div className="flex gap-2 pt-2">
            <div className="h-6 w-16 rounded-pill bg-paper-sunken" />
            <div className="h-6 w-20 rounded-pill bg-paper-sunken" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExhaustedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-card border border-line bg-paper-raised px-6 py-16 text-center shadow-card">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-compass-soft text-compass">
        <SparklesIcon size={30} />
      </span>
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">
          You&rsquo;ve wandered far
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          You&rsquo;ve seen everything we have for your interests right now.
          Check back soon — the catalog keeps growing.
        </p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        Look again
      </Button>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-card border border-line bg-paper-raised px-6 py-16 text-center shadow-card">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-sunken text-ink-faint">
        <CompassIcon size={30} />
      </span>
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">
          Lost signal
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          {message ?? "Something went wrong while wandering."}
        </p>
      </div>
      <Button variant="primary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
