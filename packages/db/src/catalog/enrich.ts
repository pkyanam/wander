/**
 * Image enrichment for catalog destinations.
 *
 * Resolves a hero image URL for a destination using two strategies, cheapest
 * first:
 *
 *   1. OpenGraph / Twitter card image scraped from the page's own `<head>`
 *      (free, no third party, and usually the image the site chose itself).
 *   2. A hosted screenshot service as a fallback when the page exposes no
 *      social image. We store the service's hosted URL directly in
 *      `destinations.image_url` — no object storage of our own (per PLAN §1,
 *      object storage is deferred).
 *
 * This is an internal curation helper, not a runtime dependency: it runs from
 * the `enrich-images` script against the database. Per PRD §8 enrichment is an
 * assist; a human still approves catalog items.
 */

const USER_AGENT =
  "WanderBot/0.1 (+https://wander.app; catalog image enrichment)";

/** How a given image URL was obtained — useful for logging / quality notes. */
export type ImageSource = "og" | "screenshot" | "none";

export interface ResolvedImage {
  imageUrl: string | null;
  source: ImageSource;
}

export interface ResolveImageOptions {
  /** Abort the page fetch after this many ms. Default 8000. */
  timeoutMs?: number;
  /** Skip the screenshot fallback (og-image only). Default false. */
  ogOnly?: boolean;
}

/* ── OpenGraph / Twitter scraping ──────────────────────────────────────── */

// Matches <meta property="og:image" content="..."> in either attribute order
// and for the property names we care about. Hoisted so we don't recompile per
// call (js-hoist-regexp).
const META_TAG_RE = /<meta\b[^>]*>/gi;
const PROPERTY_RE = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i;
const CONTENT_RE = /\bcontent\s*=\s*["']([^"']*)["']/i;

const IMAGE_PROPERTIES = [
  "og:image:secure_url",
  "og:image:url",
  "og:image",
  "twitter:image",
  "twitter:image:src",
];

/** Pull the best social image URL out of a chunk of HTML, if present. */
export function extractOgImage(html: string, baseUrl: string): string | null {
  const found = new Map<string, string>();

  for (const tag of html.matchAll(META_TAG_RE)) {
    const raw = tag[0];
    const prop = PROPERTY_RE.exec(raw)?.[1]?.toLowerCase();
    if (!prop || !IMAGE_PROPERTIES.includes(prop)) continue;
    const content = CONTENT_RE.exec(raw)?.[1]?.trim();
    if (content && !found.has(prop)) found.set(prop, content);
  }

  // Prefer in priority order.
  for (const prop of IMAGE_PROPERTIES) {
    const value = found.get(prop);
    if (!value) continue;
    const absolute = toAbsoluteUrl(value, baseUrl);
    if (absolute) return absolute;
  }
  return null;
}

function toAbsoluteUrl(value: string, baseUrl: string): string | null {
  try {
    // Handles protocol-relative (//cdn/...), relative (/img.png), and absolute.
    const url = new URL(value, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchOgImage(
  url: string,
  timeoutMs: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;

    // Only the <head> carries the meta tags; read a bounded prefix so we don't
    // buffer multi-megabyte pages.
    const html = await readBoundedText(res, 512 * 1024);
    return extractOgImage(html, res.url || url);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Read at most `maxBytes` of a response body as UTF-8 text, then stop. */
async function readBoundedText(
  res: Response,
  maxBytes: number,
): Promise<string> {
  if (!res.body) return await res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let out = "";
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      out += decoder.decode(value, { stream: true });
      // Stop early once </head> is in view — the meta tags are all above it.
      if (out.includes("</head>")) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return out;
}

/* ── Hosted screenshot fallback ────────────────────────────────────────── */

/**
 * Build a hosted screenshot URL for `url` using the configured provider.
 *
 * Providers (set `SCREENSHOT_PROVIDER`):
 *   - `microlink` (default): https://microlink.io — free tier needs no key.
 *     Returns a hosted screenshot URL we can store directly.
 *   - `template`: provide `SCREENSHOT_URL_TEMPLATE` containing `{url}`, which is
 *     replaced with the URL-encoded target. Lets you point at ScreenshotOne,
 *     urlbox, thum.io, etc. without code changes.
 *   - `none`: disable the fallback entirely.
 */
export async function fetchScreenshotUrl(
  url: string,
  timeoutMs: number,
): Promise<string | null> {
  const provider = (
    process.env.SCREENSHOT_PROVIDER ?? "microlink"
  ).toLowerCase();
  if (provider === "none") return null;

  if (provider === "template") {
    const template = process.env.SCREENSHOT_URL_TEMPLATE;
    if (!template || !template.includes("{url}")) {
      throw new Error(
        "SCREENSHOT_PROVIDER=template requires SCREENSHOT_URL_TEMPLATE with a {url} placeholder.",
      );
    }
    return template.replace("{url}", encodeURIComponent(url));
  }

  if (provider === "microlink")
    return await fetchMicrolinkScreenshot(url, timeoutMs);

  throw new Error(`Unknown SCREENSHOT_PROVIDER: ${provider}`);
}

async function fetchMicrolinkScreenshot(
  url: string,
  timeoutMs: number,
): Promise<string | null> {
  const endpoint = process.env.MICROLINK_API_KEY
    ? "https://pro.microlink.io"
    : "https://api.microlink.io";
  const params = new URLSearchParams({
    url,
    screenshot: "true",
    meta: "false",
    "viewport.width": "1280",
    "viewport.height": "800",
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${endpoint}/?${params}`, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(process.env.MICROLINK_API_KEY
          ? { "x-api-key": process.env.MICROLINK_API_KEY }
          : {}),
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      data?: { screenshot?: { url?: string }; image?: { url?: string } };
    };
    if (json.status !== "success") return null;
    return json.data?.screenshot?.url ?? json.data?.image?.url ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ── Public entrypoint ─────────────────────────────────────────────────── */

/** Resolve the best available hero image for a destination URL. */
export async function resolveImage(
  url: string,
  options: ResolveImageOptions = {},
): Promise<ResolvedImage> {
  const timeoutMs = options.timeoutMs ?? 8000;

  const og = await fetchOgImage(url, timeoutMs);
  if (og) return { imageUrl: og, source: "og" };

  if (options.ogOnly) return { imageUrl: null, source: "none" };

  const shot = await fetchScreenshotUrl(url, timeoutMs);
  if (shot) return { imageUrl: shot, source: "screenshot" };

  return { imageUrl: null, source: "none" };
}
