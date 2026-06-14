import { clsx, type ClassValue } from "clsx";
// Import from the narrow `/url` subpath (no zod/barrel) so this util — which is
// pulled into nearly every client component via `cn` — doesn't drag the whole
// @wander/shared barrel into the browser graph (which broke Turbopack module
// instantiation). The web app and curation engine still share one canonicalizer.
import { getDomain } from "@wander/shared/url";

/** Conditional className helper. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export { getDomain };

/** Small site icon via Google's favicon service (no storage needed). */
export function faviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain,
  )}&sz=${size}`;
}

/** Curated warm/earthy gradient pairs for typographic hero fallbacks. */
const HERO_PALETTES: { from: string; to: string }[] = [
  { from: "#e8a07e", to: "#bf4d2c" }, // terracotta
  { from: "#e9c277", to: "#c8923a" }, // ochre
  { from: "#aec19f", to: "#6f8a66" }, // sage
  { from: "#d9a78c", to: "#b06a4e" }, // clay
  { from: "#e0a9ad", to: "#bf6d77" }, // dusty rose
  { from: "#9fb0bf", to: "#6a7d8f" }, // slate blue
  { from: "#c6a3bd", to: "#8c6080" }, // plum
  { from: "#c8c489", to: "#8f8d4f" }, // olive
];

/** Deterministically pick a hero palette from a seed string (e.g. the domain). */
export function pickHero(seed: string): { from: string; to: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return HERO_PALETTES[h % HERO_PALETTES.length]!;
}

/** Compact relative time, e.g. "just now", "4h", "2d". */
export function timeAgo(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
