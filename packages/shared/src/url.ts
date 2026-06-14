/**
 * URL helpers shared by the web app and the curation engine so both agree on
 * how a destination URL is normalized. Canonicalization is what makes dedup
 * durable: two links that point at the same page must collapse to one string.
 */

/** Normalize a URL to a bare domain (drops protocol + leading www). */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url;
  }
}

// Query params that only carry tracking/session noise. Anything matching these
// (or the `utm_` prefix) is dropped so the same page isn't seen as many URLs.
const TRACKING_PARAMS = new Set([
  "gclid",
  "fbclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref",
  "ref_src",
  "ref_url",
  "referrer",
  "source",
  "_hsenc",
  "_hsmi",
  "vero_id",
  "yclid",
  "wickedid",
  "twclid",
]);

function isTrackingParam(key: string): boolean {
  const k = key.toLowerCase();
  return k.startsWith("utm_") || TRACKING_PARAMS.has(k);
}

/**
 * Canonicalize a raw URL into a stable comparison key. Returns `null` when the
 * input isn't a usable http(s) URL. Rules: force http(s), lowercase host, drop
 * leading `www.`, strip tracking params, drop the fragment, and normalize a
 * bare trailing slash so `example.com` and `example.com/` collapse.
 */
export function canonicalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  url.hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  url.hash = "";
  // Default ports add no information.
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  for (const key of [...url.searchParams.keys()]) {
    if (isTrackingParam(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();

  // Collapse a path of just "/" to empty so the trailing slash doesn't fork
  // the key; keep meaningful trailing slashes on deeper paths untouched.
  if (url.pathname === "/") url.pathname = "";

  let out = url.toString();
  // URL serialization re-adds a trailing slash for empty paths; trim it back.
  if (url.pathname === "" && !url.search && out.endsWith("/")) {
    out = out.slice(0, -1);
  }
  return out;
}
