/**
 * Safety / moderation gate (plan §6.6). A hard filter that runs before a
 * candidate is shown to a reviewer: obvious "avoid" categories (news, paywall,
 * thin affiliate/SEO, NSFW) are rejected with a reason; softer signals become
 * content flags and feed the spam penalty in scoring.
 */

export interface SafetyResult {
  ok: boolean;
  reason?: string;
  flags: string[];
  /** 0..1 spam intensity, fed to the quality scorer's penalty term. */
  spamSignals: number;
}

// Domains we never want in the catalog. Intentionally small + illustrative;
// extend via review feedback.
const DOMAIN_DENYLIST = new Set<string>([
  "pornhub.com",
  "xvideos.com",
  "onlyfans.com",
]);

const NSFW_TERMS = ["porn", "nsfw", "xxx", "escort", "camgirl"];
const NEWS_TERMS = ["breaking news", "live updates", "press release"];
const PAYWALL_TERMS = [
  "subscribe to read",
  "subscribers only",
  "metered paywall",
];
const AFFILIATE_TERMS = [
  "best deals",
  "coupon code",
  "affiliate link",
  "% off today",
];

function countHits(haystack: string, terms: string[]): number {
  return terms.reduce((n, t) => (haystack.includes(t) ? n + 1 : n), 0);
}

export function evaluateSafety(input: {
  domain: string;
  title: string;
  text: string;
  contentFlags: string[];
}): SafetyResult {
  const haystack =
    `${input.title} ${input.text} ${input.contentFlags.join(" ")}`.toLowerCase();
  const flags = new Set(input.contentFlags);

  if (DOMAIN_DENYLIST.has(input.domain)) {
    return {
      ok: false,
      reason: "denylisted domain",
      flags: [...flags],
      spamSignals: 1,
    };
  }
  if (countHits(haystack, NSFW_TERMS) > 0) {
    flags.add("nsfw");
    return {
      ok: false,
      reason: "possible NSFW content",
      flags: [...flags],
      spamSignals: 1,
    };
  }
  if (countHits(haystack, NEWS_TERMS) > 0) {
    flags.add("news");
    return {
      ok: false,
      reason: "time-sensitive news",
      flags: [...flags],
      spamSignals: 0.5,
    };
  }
  if (countHits(haystack, PAYWALL_TERMS) > 0) {
    flags.add("paywall");
    return {
      ok: false,
      reason: "paywalled",
      flags: [...flags],
      spamSignals: 0.5,
    };
  }

  // Soft signal: affiliate/SEO heaviness lowers the score but isn't a hard fail.
  const affiliateHits = countHits(haystack, AFFILIATE_TERMS);
  if (affiliateHits > 0) flags.add("affiliate");
  const spamSignals = Math.min(1, affiliateHits / 2);

  return { ok: true, flags: [...flags], spamSignals };
}
