/**
 * The frontier makes dedup durable. It canonicalizes URLs (via the shared
 * canonicalizer so the web app and engine agree), rejects anything already in
 * the candidate store OR the live `destinations` table, and enforces a
 * per-domain cap so one site can't flood a run (plan §6.2).
 */

import { getDb, schema } from "@wander/db";
import { canonicalizeUrl, getDomain } from "@wander/shared";

export interface AdmitResult {
  url: string;
  domain: string;
}

export class Frontier {
  private known = new Set<string>();
  private perDomain = new Map<string, number>();

  private constructor(private readonly perDomainCap: number) {}

  /** Build a frontier pre-seeded with every URL we've already seen. */
  static async create(perDomainCap: number): Promise<Frontier> {
    const frontier = new Frontier(perDomainCap);
    const db = getDb();

    const candidates = await db
      .select({ url: schema.curationCandidates.url })
      .from(schema.curationCandidates);
    for (const row of candidates) frontier.known.add(row.url);

    // Destination URLs are stored raw; canonicalize for an apples-to-apples key.
    const destinations = await db
      .select({ url: schema.destinations.url })
      .from(schema.destinations);
    for (const row of destinations) {
      const canonical = canonicalizeUrl(row.url);
      if (canonical) frontier.known.add(canonical);
    }
    return frontier;
  }

  /**
   * Admit a raw URL into the run, returning its canonical form + domain, or
   * null if invalid, a duplicate, or over the per-domain cap. Admitting marks
   * the URL seen so later candidates in the same run also dedup against it.
   */
  admit(rawUrl: string): AdmitResult | null {
    const url = canonicalizeUrl(rawUrl);
    if (!url || this.known.has(url)) return null;

    const domain = getDomain(url);
    const count = this.perDomain.get(domain) ?? 0;
    if (count >= this.perDomainCap) return null;

    this.known.add(url);
    this.perDomain.set(domain, count + 1);
    return { url, domain };
  }
}
