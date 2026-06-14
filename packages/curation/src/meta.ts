/**
 * Lightweight HTML metadata extraction for enrichment. Regex-based (no DOM
 * dependency) and bounded to the document head's worth of content. We reuse
 * `extractOgImage` from @wander/db for the image; here we pull text signals.
 */

export interface PageMeta {
  title?: string;
  description?: string;
  wordCount: number;
}

const META_TAG_RE = /<meta\b[^>]*>/gi;
const PROPERTY_RE = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i;
const CONTENT_RE = /\bcontent\s*=\s*["']([^"']*)["']/i;
const TITLE_RE = /<title[^>]*>([^<]*)<\/title>/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function extractMeta(html: string): PageMeta {
  const metas = new Map<string, string>();
  for (const tag of html.matchAll(META_TAG_RE)) {
    const prop = PROPERTY_RE.exec(tag[0])?.[1]?.toLowerCase();
    if (!prop) continue;
    const content = CONTENT_RE.exec(tag[0])?.[1];
    if (content && !metas.has(prop)) metas.set(prop, decodeEntities(content));
  }

  const title =
    metas.get("og:title") ||
    metas.get("twitter:title") ||
    (TITLE_RE.exec(html)?.[1]
      ? decodeEntities(TITLE_RE.exec(html)![1]!)
      : undefined);

  const description =
    metas.get("og:description") ||
    metas.get("twitter:description") ||
    metas.get("description");

  // Cheap content-depth proxy: visible-ish word count after stripping markup.
  const text = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const wordCount = text ? text.trim().split(" ").filter(Boolean).length : 0;

  return { title, description, wordCount };
}
