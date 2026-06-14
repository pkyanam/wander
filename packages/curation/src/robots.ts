/**
 * Minimal, polite robots.txt gate for the fetch step (plan §6.2). Fetches and
 * caches each origin's robots.txt once, parses Disallow rules for `*` (and our
 * UA), and checks the path prefix. Fail-open: any error → allowed. Skipped in
 * mock mode by the pipeline.
 */

import { fetchWithTimeout } from "./util";

const cache = new Map<string, string[]>();

async function loadDisallows(
  origin: string,
  timeoutMs: number,
): Promise<string[]> {
  const cached = cache.get(origin);
  if (cached) return cached;

  const res = await fetchWithTimeout(
    `${origin}/robots.txt`,
    { headers: { accept: "text/plain" } },
    timeoutMs,
  );
  let disallows: string[] = [];
  if (res && res.ok) {
    const text = await res.text().catch(() => "");
    disallows = parseDisallows(text);
  }
  cache.set(origin, disallows);
  return disallows;
}

/** Collect Disallow paths in groups whose User-agent matches `*` or WanderBot. */
function parseDisallows(text: string): string[] {
  const out: string[] = [];
  let applies = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [field, ...rest] = line.split(":");
    const key = field?.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      const ua = value.toLowerCase();
      applies = ua === "*" || ua.includes("wanderbot");
    } else if (key === "disallow" && applies && value) {
      out.push(value);
    }
  }
  return out;
}

export async function isFetchAllowed(
  url: string,
  timeoutMs: number,
): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const disallows = await loadDisallows(parsed.origin, timeoutMs);
  const path = parsed.pathname || "/";
  return !disallows.some((rule) => path.startsWith(rule));
}
