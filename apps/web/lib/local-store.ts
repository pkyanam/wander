"use client";

import type {
  DestinationCard,
  HistoryItem,
  InteractionType,
} from "@wander/shared";

/**
 * Client-side personalization store. Wander is usable anonymously, so a
 * visitor's interests, saved destinations, history, and "already seen" set live
 * entirely in localStorage rather than in the database. This is the single
 * bridge the UI uses for all personalization (replacing the old per-user API).
 */

const KEYS = {
  interests: "wander.interests",
  onboarded: "wander.onboarded",
  saved: "wander.saved",
  history: "wander.history",
  seen: "wander.seen",
} as const;

const HISTORY_CAP = 60;
const SEEN_CAP = 400;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (private mode) — degrade gracefully.
  }
}

/* Interests + onboarding -------------------------------------------------- */

export function getInterests(): string[] {
  return read<string[]>(KEYS.interests, []);
}

export function setInterests(slugs: string[]): void {
  write(KEYS.interests, [...new Set(slugs)]);
  write(KEYS.onboarded, true);
}

export function hasOnboarded(): boolean {
  return read<boolean>(KEYS.onboarded, false);
}

/* "Already seen" exclusion set ------------------------------------------- */

export function getSeen(): string[] {
  return read<string[]>(KEYS.seen, []);
}

export function addSeen(id: string): void {
  const seen = getSeen();
  if (seen.includes(id)) return;
  seen.push(id);
  // Keep the most recent ids so the exclusion list stays bounded.
  write(KEYS.seen, seen.slice(-SEEN_CAP));
}

/* Saved ------------------------------------------------------------------- */

export function getSaved(): SavedEntry[] {
  return read<SavedEntry[]>(KEYS.saved, []);
}

export interface SavedEntry {
  destination: DestinationCard;
  savedAt: string;
}

export function isSaved(id: string): boolean {
  return getSaved().some((s) => s.destination.id === id);
}

export function addSaved(card: DestinationCard): void {
  const saved = getSaved();
  if (saved.some((s) => s.destination.id === card.id)) return;
  write(KEYS.saved, [
    { destination: card, savedAt: new Date().toISOString() },
    ...saved,
  ]);
}

export function removeSaved(id: string): void {
  write(
    KEYS.saved,
    getSaved().filter((s) => s.destination.id !== id),
  );
}

/* History ----------------------------------------------------------------- */

export function getHistory(): HistoryItem[] {
  return read<HistoryItem[]>(KEYS.history, []);
}

/**
 * Record an interaction with a destination. Deduped by destination id (the most
 * recent action wins and moves to the front), capped to the latest entries.
 */
export function recordHistory(
  card: DestinationCard,
  type: InteractionType,
): void {
  const history = getHistory().filter((h) => h.destination.id !== card.id);
  const next: HistoryItem[] = [
    { destination: card, type, at: new Date().toISOString() },
    ...history,
  ];
  write(KEYS.history, next.slice(0, HISTORY_CAP));
}
