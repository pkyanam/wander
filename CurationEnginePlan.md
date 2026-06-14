# Wander Curation Engine Plan

Version: 0.1
Date: June 14, 2026
Status: Design proposal
Owner: Preetham
Related: `PRD.md` §8 (Curation Engine), §9 (Recommendation), §10 (Data Model),
§15 (Risks); `PLAN.md` §1 (Stack), §5 (Data Model), §6 (API); `AGENTS.md`.

---

## 1. Purpose

Wander's catalog is the product. PRD §8 makes curation a first-class system:
manual seeding, enrichment, approval status, and recommendation inputs. Today
the catalog is a ~54-entry hand-written fixture
(`packages/db/src/catalog/seed-catalog.ts`) and the only growth paths are the
admin UI, JSON import, and the seed script. PRD §6/§14 want **500–2,000
approved destinations** before meaningful external testing.

This document specifies a **Curation Engine**: a system that continuously
**discovers cool web destinations**, **enriches** them, **scores and filters**
them, and **feeds them into the existing Wander import path** as
`needs_review` candidates for a human to approve.

The hard constraint from the PRD is speed of curation without sacrificing the
human quality gate (§8: "Human review remains the quality gate") and without
"aggressive crawling" (§15). The design below is built so that finding and
enriching a candidate is **fast and mostly API-driven**, and a real browser is
used only where the web genuinely requires one.

---

## 2. Goals and non-goals

### Goals

- Rapidly discover high-signal, evergreen, delightful sites (personal sites,
  creative coding, indie tools, explainers, demos, design references — PRD §8).
- Be **fast**: minimize model-in-the-loop browser control, which is the slow
  path. Prefer search/fetch APIs and deterministic extraction; parallelize.
- Produce candidates that are **directly importable** into the Wander DB via the
  existing contract (`destinationInputSchema` / `catalogImportSchema`).
- Auto-enrich each candidate (hero image, hook, summary, taxonomy tags, quality
  score, safety flags) so the human reviewer mostly approves/rejects.
- Be inspectable and resumable (a frontier/queue + a candidate store + run logs).
- Respect legality and politeness (official APIs, RSS, sitemaps, robots; no
  scraping of private/restricted sources — PRD §15).

### Non-goals (for v1)

- Public user submissions (PRD MVP out-of-scope).
- A bespoke whole-web crawler. We ride search/index APIs and curated hubs.
- Fully autonomous approval. The engine proposes; a human disposes.
- Embeddings-first recommendation (kept optional; see §9).

---

## 3. Design principles

1. **API-first, browser-as-fallback.** ~85% of discovery can be done with
   search/fetch APIs that return links + content in one call, with no browser
   session and no per-action LLM reasoning. Only escalate to a real browser when
   a source is JS-rendered, infinite-scrolling, or behind anti-bot/auth.
2. **Deterministic extraction over model-driven clicking.** Model-controlled
   navigation is slow and expensive. We use the LLM **once** to synthesize a
   reusable extractor for a source, then run it deterministically (and cached)
   on every subsequent page.
3. **Parallelism is the speed lever.** Browserbase gives 25–250+ concurrent
   sessions; the fast lane is just bounded `Promise.all` over HTTP. Throughput,
   not single-page latency, is what gets us to 500+.
4. **Reuse the existing contract.** Candidates are shaped exactly like
   `DestinationInput`, sourced as `api_ingestion`, imported through the same
   code path admins already use. No parallel ingestion logic.
5. **Human gate preserved.** Everything lands as `needs_review`. Approval is the
   only thing that makes a destination wander-able.

---

## 4. Why Browserbase (and where it fits)

Browserbase is "the complete platform to build and deploy agents that browse the
web." For Wander we use four of its surfaces, in order of how much we lean on
them:

| Surface | What it does | Wander use | Speed profile |
| --- | --- | --- | --- |
| **Search API** | Web search built for agents — "find relevant websites from a single query." | Topic/seed queries → candidate URLs. The core of the rapid discovery lane. | Fast, no browser, no model loop |
| **Fetch API** | Any URL → HTML / JSON / **markdown**, token-efficient. | Pull page content + metadata for enrichment without a session. | Fast, no browser |
| **Sessions + Stagehand** | Fleets of concurrent headless browsers with `act`/`observe`/`extract` AI primitives and **server-side caching**. | JS-heavy directories, infinite scroll, auth walls; bulk screenshots. | Slower per page, but 25–250+ in parallel |
| **Agent Identity** | Gets past anti-bot, CAPTCHAs, auth walls. | Reliable access to showcase sites that block naive fetchers. | Enables otherwise-blocked sources |

**Why this beats "Playwright + a model driving it":**

- The **Search/Fetch APIs replace most browser work entirely** — they're the
  "rapid search/index engine" the project wants.
- When we do need a browser, **Stagehand `observe()` then `act()` is 2–3x faster
  than per-action `act()`**, and Browserbase **caches `observe`/`act`/`extract`
  server-side** so repeated runs "return instantly without consuming LLM
  tokens." We exploit this by **codifying** a source's extractor once and
  replaying it.
- Browserbase manages the fleet (no local Chromium clusters), so we scale by
  raising a concurrency number, not by provisioning machines.

Stagehand is also Playwright-compatible, so any deterministic Playwright we
already understand (e.g. the local screenshot approach) ports directly onto
Browserbase sessions when we need cloud parallelism or stealth.

---

## 5. Architecture overview

```text
                    ┌──────────────────────────────────────────────┐
                    │                 SOURCES                        │
                    │  Browserbase Search · Exa neural/find_similar  │
                    │  GitHub awesome-lists · Are.na · HN/Lobsters   │
                    │  Reddit JSON · RSS/sitemaps · design showcases │
                    └───────────────┬──────────────────────────────┘
                                    │ raw candidate URLs (+hints)
                                    ▼
        ┌──────────────────────────────────────────────────────┐
        │  FRONTIER / INDEX ENGINE  (Postgres-backed queue)      │
        │  • canonicalize URL        • dedup vs candidates + DB  │
        │  • per-domain politeness   • robots / disallow checks  │
        └───────────────┬──────────────────────────────────────┘
                        │ dequeued candidate
                        ▼
        ┌──────────────────────────────────────────────────────┐
        │  FETCH / RENDER                                        │
        │  fast lane: Browserbase Fetch API (HTML/markdown)      │
        │  browser lane: Browserbase Session + codified extract  │
        └───────────────┬──────────────────────────────────────┘
                        ▼
        ┌──────────────────────────────────────────────────────┐
        │  ENRICH                                                │
        │  • image: resolveImage() (og → screenshot fallback)    │
        │  • AI: hook, summary, taxonomy tags, safety flags      │
        │  • metadata: title, domain, language, content depth    │
        └───────────────┬──────────────────────────────────────┘
                        ▼
        ┌──────────────────────────────────────────────────────┐
        │  SCORE + SAFETY GATE                                   │
        │  • qualityScore v0 (§9)    • denylist / NSFW / news    │
        └───────────────┬──────────────────────────────────────┘
                        ▼
        ┌──────────────────────────────────────────────────────┐
        │  CANDIDATE STORE  (curation_candidates, needs_review)  │
        └───────────────┬──────────────────────────────────────┘
                        │ admin reviews / bulk-approves
                        ▼
        ┌──────────────────────────────────────────────────────┐
        │  IMPORT BRIDGE → Wander DB                             │
        │  shape = DestinationInput · sourceType=api_ingestion   │
        │  POST /api/v1/admin/import  (existing) or curation API │
        └────────────────────────────────────────────────────────┘
```

The flow maps 1:1 onto PRD §8's "ingestion, review, enrichment, and quality
scoring" and reuses the import path documented in `AGENTS.md`.

---

## 6. Components

### 6.1 Source adapters

A source adapter is a small module that yields raw candidates. It does **no**
enrichment — just discovery. Uniform interface so the pipeline treats all
sources identically:

```ts
// packages/curation/src/sources/types.ts (proposed)
export interface RawCandidate {
  url: string;
  sourceId: string;            // e.g. "exa:personal-sites"
  rawTitle?: string;
  rawTags?: string[];          // free-form hints, mapped to taxonomy later
  hintScore?: number;          // source-native signal (HN points, stars…)
  discoveredVia?: string;      // query / list / seed url, for audit
}

export interface Source {
  id: string;
  kind: "search" | "api" | "feed" | "browser";
  /** Stream raw candidates. Implementations page internally. */
  discover(ctx: SourceContext): AsyncIterable<RawCandidate>;
}
```

Initial adapters (priority order by yield × signal):

1. **`browserbase-search`** — topic queries ("interactive explorable essays",
   "generative art playground", "personal site digital garden"). Fast lane.
2. **`exa-search` / `exa-similar`** — neural search with `category:"personal
   site"`; **`find_similar(url)` seeded from our highest-quality approved
   destinations** ("more cool sites like ciechanow.ski"). This is the strongest
   lever for *quality* expansion.
3. **`github-awesome`** — parse `awesome-*` READMEs via the GitHub API
   (creative coding, indie web, design tools).
4. **`arena`** — Are.na public API channels (already-curated link blocks).
5. **`hn-algolia` / `lobsters`** — high-score, evergreen "Show HN"/tools/essays;
   filter out news.
6. **`reddit-json`** — r/InternetIsBeautiful, r/webgames (top/all-time).
7. **`feeds`** — RSS + sitemaps of curated newsletters and directories.
8. **`showcase-browser`** (browser lane) — Awwwards / SiteInspire / Godly style
   galleries that need JS/scroll, via a codified Stagehand extractor.

Adapters are config-light and registered in a `curation_sources` table (§8) so
they can be enabled/disabled and rate-tuned without code changes.

### 6.2 Frontier / index engine

The "rapid index engine" is a Postgres-backed work queue (`curation_candidates`
with a `status` lifecycle), not an in-memory list, so runs are resumable and
dedup is durable.

Responsibilities:

- **Canonicalize** URLs (strip tracking params, normalize `www`, lowercase host,
  drop fragments) — reuse `getDomain()` from `apps/web/lib/utils.ts`.
- **Dedup** against both the candidate store *and* the live `destinations` table
  (don't re-surface what's already imported/rejected).
- **Politeness**: per-domain concurrency cap + min interval; honor `robots.txt`
  Disallow for the fetch step.
- **Domain flood control**: cap candidates per domain per run so one site can't
  dominate.
- Optional **near-dup detection** via embeddings later (§9 / pgvector).

### 6.3 Fetch / render

Two strategies, cheapest first (mirrors the principle in §3):

- **Fast lane — Browserbase Fetch API**: URL → markdown/HTML/JSON in one call.
  Token-efficient, no session. Used for the large majority of candidates.
- **Browser lane — Browserbase Session + Stagehand**: only when the fast lane
  returns thin/blocked content or the source is inherently interactive. Use a
  **codified extractor** (a saved `observe`-derived selector script or a typed
  `extract(schema)` call) rather than letting a model free-drive. Stagehand's
  server-side cache makes repeat extraction effectively free.

A bounded **session pool** caps live browsers at `min(plan limit, configured)`
and backs off on `429 Too Many Requests` (Browserbase's over-limit signal).

### 6.4 Enrichment

Reuses what already exists and adds an AI assist (PRD §8: AI enrichment is an
internal helper, not product-critical, and is human-reviewed):

- **Image** — call the existing `resolveImage()` in
  `packages/db/src/catalog/enrich.ts` (OpenGraph first, hosted screenshot
  fallback). For browser-lane sources we can capture the screenshot directly in
  the Browserbase session and skip the third-party screenshot call.
- **Text** — one batched LLM call per N candidates produces:
  - `hook` (≤400 chars, matches `destinationInputSchema`),
  - `summary` (≤4000 chars),
  - `tags` **mapped to the 12-tag taxonomy** in `packages/shared/src/tags.ts`
    (extra descriptive tags allowed but only taxonomy slugs drive recommendation
    per `AGENTS.md`),
  - `contentFlags` + a short quality note.
- **Metadata** — title, domain, detected language, a rough content-depth signal
  (word count / interactivity) for scoring.

Use a small/fast model and batch to keep enrichment off the critical path.

### 6.5 Quality score v0

Resolves an open decision in `PLAN.md` §10. Transparent, inspectable, 0–100:

```
qualityScore =
    w1 * sourceReputation        // curated hub > award site > forum > raw search
  + w2 * hasRealImage            // og:image or good screenshot
  + w3 * contentDepth            // substantive, not thin/affiliate
  + w4 * aiQualityRating         // 0–1 from the enrichment model
  + w5 * freshnessOrEvergreen    // evergreen preferred (PRD §8)
  - p1 * spamSignals             // SEO/affiliate/tracker heavy
  (clamped 0–100, manual override always wins)
```

Weights live in config so we can tune without redeploying. This score feeds the
recommender (PRD §9 boosts high quality) and the review queue ordering.

### 6.6 Safety / moderation gate

Hard filter before a candidate is shown to a reviewer (PRD §8 "avoid" list +
§15 moderation risk):

- Denylist categories: time-sensitive news, paywalled, thin affiliate/SEO, NSFW,
  broken/heavily gated.
- Domain denylist + heuristic classifiers; AI `contentFlags` as soft signals.
- Anything flagged → `rejected` with a reason, or held for explicit review.

### 6.7 Review + import bridge

- **Candidate store**: all survivors land in `curation_candidates` with
  `status = "needs_review"` (or `rejected`).
- **Review UI**: extend the existing admin Catalog
  (`apps/web/components/admin/admin-catalog.tsx`) with a "Candidates" tab that
  reads the curation store, shows the enriched preview card, and offers
  approve / reject / edit / bulk-approve.
- **Import**: approving maps the candidate to `DestinationInput`
  (`sourceType: "api_ingestion"`, `status: "approved"`) and writes through the
  **existing** `upsertDestinationWithTags()` /
  `POST /api/v1/admin/import` path (`apps/web/app/api/v1/admin/import/route.ts`),
  which already records a `catalog_imports` audit row. No new write path needed.

---

## 7. Wander API integration

Everything is designed to be drop-in compatible with `/api/v1`.

**Reused, unchanged:**

- `catalogImportSchema` / `destinationInputSchema` (`packages/shared`) — the
  candidate→destination shape. Fields: `url`, `title`, `hook`, `summary?`,
  `imageUrl?`, `tags[]`, `sourceType`, `status`, `qualityScore`,
  `contentFlags[]`.
- `POST /api/v1/admin/import` — bulk import, admin-gated, audited.
- `sourceType: "api_ingestion"` — already a valid enum value
  (`packages/shared/src/enums.ts`) created exactly for this.
- `resolveImage()` and `getDomain()` helpers.

**New, admin-gated (`/api/v1/admin/curation/*`):**

| Endpoint | Purpose |
| --- | --- |
| `POST /api/v1/admin/curation/runs` | Kick off a discovery run (sources, limits). |
| `GET /api/v1/admin/curation/runs/:id` | Run status + counts (discovered/enriched/rejected). |
| `GET /api/v1/admin/curation/candidates` | List/filter candidates for review. |
| `POST /api/v1/admin/curation/candidates/:id/approve` | Map → DestinationInput, import, mark imported. |
| `POST /api/v1/admin/curation/candidates/:id/reject` | Reject with reason. |
| `POST /api/v1/admin/curation/candidates/bulk-approve` | Approve a filtered batch. |

All gated by the same `getOrCreateUser()` + `isAdmin()` checks used by existing
admin routes, and all set `runtime = "nodejs"` / `dynamic = "force-dynamic"` per
`AGENTS.md` conventions.

The discovery/enrichment work itself runs **out of band** (script or worker;
§10), not inside a request handler — the API only triggers and reads.

---

## 8. Data model additions

New tables, additive to the schema in `packages/db/src/schema.ts`. Reuses the
existing `catalog_imports` audit table for the final import step.

```text
curation_sources
  id, source_id (unique), kind, enabled, config (jsonb),
  rate_limit (jsonb), last_run_at, created_at

curation_runs
  id, started_by_user_id, sources (jsonb), status,
  discovered, enriched, accepted, rejected, imported,
  started_at, finished_at, notes

curation_candidates
  id, url (unique, canonicalized), domain, source_id, run_id,
  raw (jsonb: rawTitle/rawTags/hints),
  enriched (jsonb: title/hook/summary/imageUrl/tags/contentFlags),
  quality_score, status (discovered|enriching|needs_review|rejected|imported),
  reject_reason, destination_id (set once imported),
  created_at, updated_at
  -- optional later: embedding vector(N)  (pgvector, see §9)
```

Notes:

- `curation_candidates.status` is the engine's own lifecycle and is distinct
  from `destinations.status`; only on import do we write a real destination.
- `url` uniqueness + a check against `destinations.url` gives durable dedup.
- Keeping candidates separate from `destinations` means the live catalog only
  ever contains reviewed items (PRD §8 quality gate).

---

## 9. Recommendation & embeddings (optional, deferred)

- v0 needs no embeddings (consistent with `PLAN.md` §1/§7). The engine simply
  fills `quality_score` and taxonomy `tags`, which the existing tag-weighted
  recommender already consumes.
- When we adopt **pgvector** (deferred in `PLAN.md`), the same embeddings power
  three things at once: candidate **near-dup detection**, **`find_similar` seed
  expansion** quality, and PRD §3 "more like this" recommendations. Designing
  `curation_candidates.embedding` now (commented/optional) keeps that door open
  without committing.

---

## 10. Where it lives & how it runs

- **New package `packages/curation`** (library): source adapters, frontier,
  fetch/render, enrichment, scoring, safety, import bridge. Pure TS, imports
  `@wander/shared` and `@wander/db` like the rest of the monorepo
  (extensionless relative imports, ships TS source — `AGENTS.md`).
- **Run modes:**
  1. **CLI / script first** (matches today's `pnpm db:seed` / `pnpm db:enrich`
     ergonomics): `pnpm curate --sources=exa,browserbase-search --limit=200`.
     Fastest path to value; no new service.
  2. **Worker later**: promote to the deferred `worker` service in `PLAN.md` §4
     for scheduled runs, triggered by the curation API.
- **Admin UI**: a "Candidates" tab inside the existing `/admin` Catalog page.

This staging keeps Milestone-1 simplicity: ship the script + candidate store +
review tab before standing up any always-on infrastructure.

---

## 11. Configuration & secrets

New env vars (documented in `.env.example` and `apps/web/.env.example`,
following the pattern established for the screenshot provider):

```bash
# --- Browserbase (discovery + browser lane) ---
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
BROWSERBASE_MAX_CONCURRENCY=20        # stay under plan limit; pool caps sessions

# --- Exa (neural search + find_similar) ---
EXA_API_KEY=

# --- Enrichment model (hook/summary/tags) ---
CURATION_MODEL=                       # small/fast model id
CURATION_MODEL_API_KEY=               # or route via Browserbase Model Gateway

# --- Engine tuning ---
CURATION_PER_DOMAIN_CAP=3
CURATION_FETCH_TIMEOUT_MS=8000
```

Screenshot enrichment reuses the already-shipped `SCREENSHOT_PROVIDER` /
`MICROLINK_API_KEY` / `SCREENSHOT_URL_TEMPLATE` vars.

---

## 12. Performance strategy (the core ask: rapid, not model-slow)

1. **Most discovery never opens a browser.** Browserbase Search + Fetch and Exa
   return links + content via API. This is the rapid index lane.
2. **No model-in-the-loop navigation.** Browser-lane sources get a
   codified extractor (built once with `observe`/`extract`, then replayed);
   Stagehand's server-side caching makes repeats token-free and instant.
3. **Throughput via concurrency.** Fast lane = bounded `Promise.all` over HTTP;
   browser lane = a pool of up to `BROWSERBASE_MAX_CONCURRENCY` parallel
   sessions with 429 backoff.
4. **Cheap-before-expensive ordering.** Try HTTP/Fetch + `og:image` before ever
   paying for a screenshot or a session.
5. **Batched, small-model enrichment.** One LLM call per batch of candidates,
   not per page; fast model; structured output.
6. **Incremental & resumable.** Durable frontier + DB dedup means re-runs only
   touch new URLs; nothing is recomputed.

Target: a single `pnpm curate` run should be able to surface and fully enrich on
the order of **hundreds of review-ready candidates** in minutes, dominated by
API latency rather than browser time.

---

## 13. Build phases

### Phase 0 — Foundations
- `packages/curation` skeleton; `curation_*` tables + migration.
- `RawCandidate`/`Source` interfaces; frontier with canonicalize + dedup.

### Phase 1 — Fast lane MVP
- `browserbase-search` + `exa-search`/`exa-similar` adapters.
- Browserbase Fetch API integration; reuse `resolveImage()`.
- AI enrichment (hook/summary/taxonomy tags) + quality score v0 + safety gate.
- `pnpm curate` CLI writing to `curation_candidates`.

### Phase 2 — Review + import bridge
- `/api/v1/admin/curation/*` endpoints.
- Admin "Candidates" tab: review, approve→import, reject, bulk-approve.
- Goal: catalog crosses **500 approved** (PRD §6 testing threshold).

### Phase 3 — Browser lane
- Browserbase Session pool + Stagehand codified extractors for showcase/JS
  directories; in-session screenshot capture.
- Agent Identity for blocked sources.

### Phase 4 — Scale & quality
- `curation_sources` registry + scheduled worker runs.
- Optional pgvector for near-dup + `find_similar` + "more like this".
- Scoring/weight tuning from approve/reject feedback; grow toward 5,000 (PRD
  Phase 2).

---

## 14. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Aggressive-crawling / legal (PRD §15) | API-first, robots-aware, per-domain caps, prefer official APIs/RSS/showcases; no private/restricted scraping. |
| Low-quality flood | Quality score + safety gate + human approval; source reputation weighting; domain flood cap. |
| Browserbase / API cost | Fast lane handles the bulk; browser sessions only on demand; Stagehand caching; concurrency caps; cheap-before-expensive ordering. |
| Duplicate / stale entries | Canonicalize + DB-and-candidate dedup; reuse `last_checked_at` health sweep for staleness. |
| Taxonomy drift | AI tags constrained to the 12 known slugs for recommendation; extras allowed but non-driving. |
| Moderation burden | Auto-reject obvious "avoid" categories; reviewer only sees pre-filtered, pre-enriched candidates. |

---

## 15. Open questions

- Browserbase plan / concurrency tier to target (Free 3 vs Developer 25+).
- Search provider mix: Browserbase Search only, Exa only, or both (recommended:
  both — Browserbase for breadth, Exa `find_similar` for quality expansion).
- Enrichment model + whether to route via Browserbase Model Gateway or a direct
  provider key.
- Adopt pgvector in this initiative or keep it Phase 4.
- CLI-only for v1, or stand up the worker service immediately.
- Auto-approve threshold (if any) for very high-confidence, high-score
  candidates from trusted sources — or keep 100% human gate for v1.
- Adopt **pgGraph** (§16) for graph-native discovery + recommendation, or stay
  on hand-written SQL until it leaves alpha.

---

## 16. Optional graph layer: pgGraph

> Repo: https://github.com/Evokoa/pgGraph · Docs: https://docs.evokoa.com/pggraph
> Extension name: `graph` (Apache-2.0, PostgreSQL 14–18).

### 16.1 What it is

pgGraph is a PostgreSQL extension that gives "graph database superpowers for your
existing Postgres data." Instead of a separate graph database or a new query
language, it compiles your **ordinary tables** into a rebuildable, cache-friendly
graph index (forward/reverse **CSR adjacency**) and exposes fast graph queries as
SQL functions in the `graph` schema. Postgres stays the system of record; the
graph is **derived state** that can be rebuilt from source tables at any time.

Why it matters for Wander specifically:

- **Our data is already a graph.** `users ↔ user_interests ↔ tags ↔
  destination_tags ↔ destinations`, plus `interactions` and `saved_destinations`
  edges. Recommendation v0 (`apps/web/lib/recommendation.ts`) is hand-written
  multi-CTE tag-join SQL — exactly the "rediscover relationships via SQL on every
  query" pattern pgGraph replaces with O(1) adjacency scans.
- **No migration, no Cypher.** We register existing tables/foreign keys as
  nodes/edges; the schema in `packages/db/src/schema.ts` doesn't change.
- **Bounded + safe.** Depth limits, frontier limits, visited tracking, and
  pagination are built in — important for a user-facing path like `wander`.
- **Complements pgvector (§9), not competes.** pgvector answers "semantically
  similar content"; pgGraph answers "structurally connected via shared tags,
  shared domains, co-saves, and curated similarity." Best results combine both.

> **Maturity caveat (load-bearing):** pgGraph is **early alpha** and the authors
> explicitly say to avoid production use for now. So the plan is to adopt it
> **behind a feature flag, in dev/experimental first**, always keeping the
> existing SQL recommender as the authoritative fallback. Because the graph is
> derived/rebuildable and Postgres remains authoritative, this is a low-risk
> bolt-on, not a data-model commitment.

### 16.2 Modeling Wander as a graph

Registration is a one-time setup (idempotent, SQL-callable), conceptually:

```sql
CREATE EXTENSION graph;

-- Nodes = our existing tables
SELECT graph.add_table('public', 'destinations', 'id');
SELECT graph.add_table('public', 'tags',         'id');
SELECT graph.add_table('public', 'users',        'id');

-- Edges = our existing join/interaction tables
SELECT graph.add_edge('destination_tags', 'destination_id', 'tag_id',  'tagged');
SELECT graph.add_edge('user_interests',   'user_id',        'tag_id',  'interested_in');
SELECT graph.add_edge('interactions',     'user_id',        'destination_id', 'interacted'); -- label/filter by type
SELECT graph.add_edge('saved_destinations','user_id',       'destination_id', 'saved');

-- Filterable attributes used inside traversals (no extra SQL joins)
SELECT graph.add_filter_column('destinations', 'status');
SELECT graph.add_filter_column('destinations', 'quality_score');
SELECT graph.add_filter_column('destinations', 'domain');

SELECT graph.build();           -- compile the CSR artifact
SELECT graph.enable_sync(...);  -- keep it current as rows change (pg_cron)
```

(`graph.auto_discover()` can infer the FK edges automatically; we'd refine
labels/filters after.) Two **derived** edge sources the Curation Engine adds:

- **`similar_to`** — destination↔destination edges from Exa `find_similar`
  (§6.1) and/or pgvector cosine neighbors, stored in a
  `destination_similarities` table and registered as an edge.
- **`co_saved`** — destination↔destination co-occurrence (users who saved A also
  saved B), materialized periodically and registered as a weighted edge.

### 16.3 Incorporation proposals

Roughly ordered from "curation engine" to "product recommendation," since the
graph layer pays off in both.

**1. Smart frontier expansion for discovery (curation).**
Seed a multi-start traversal from our **highest-quality approved destinations**
along `similar_to` / shared-`tagged` edges to surface clusters of related
candidates the search adapters haven't reached yet. `graph.expand()` /
`graph.neighborhood(depth=2)` turns "find more like the best of what we already
trust" into one fast call instead of N Exa round-trips.

**2. Near-duplicate clustering of candidates (curation).**
Build a graph over `curation_candidates` linked by shared domain + high
similarity, then `graph.connected_components()` to collapse each cluster to one
canonical candidate before a human ever sees it. Stronger than pairwise URL
dedup (§6.2) because it catches mirrors/aliases across domains.

**3. Catalog coverage / gap analysis (curation health).**
`graph.aggregate()` over the tag→destination neighborhood gives per-tag approved
counts and quality distribution; `graph.isolated_nodes()` finds destinations or
tags with no good connections. This directly tells the engine *what to go search
for next* ("we're thin on indie-web games") — feeding the source adapters'
queries.

**4. Centrality-aware quality scoring (curation).**
Fold a graph signal into `qualityScore` v0 (§6.5): a candidate well-connected to
many already-approved, high-quality destinations (dense `similar_to`/shared-tag
neighborhood) is more likely a keeper. `graph.neighborhood()` + `aggregate()`
yields a cheap "connectedness to known-good" feature.

**5. Graph-native "wander" recommendation v1 (product).**
Replace the multi-CTE SQL with a multi-start traversal from the user's positive
signals: `user → (loved/saved) → destinations → (tagged/similar_to/co_saved) →
candidate destinations`, filtered to `status='approved'`, excluding the user's
`seen` set, ranked by quality + edge weight. This is collaborative-filtering-
style discovery ("sites like the ones you loved") that the current tag-only
recommender can't express cleanly. Keep the SQL recommender as fallback behind a
flag.

**6. "More like this" related destinations (product).**
On the preview card / visit page, `graph.find_related()` or
`graph.neighborhood(destination, depth=1–2)` over `similar_to` + shared-tag edges
powers PRD §3 "more like this" and Phase-3 personalization with a single fast
query.

**7. Controlled serendipity via graph distance (product).**
PRD §6 wants "surprise with control." Use `graph.shortest_path()` distance from
the user's interest cluster: surface destinations that are *N hops away* — far
enough to be novel, connected enough to stay relevant. The serendipity slider
becomes a hop-distance knob, which is far more principled than the current
`random() * 18` jitter.

**8. Explanation paths "because you liked X" (product).**
PRD Phase 3 wants explanations like "because you liked creative tools."
`graph.shortest_path()` from a recommended destination back to a node the user
loved (or an interest tag), rendered with `graph.format_path()`, yields a literal
provenance chain: `recommended ← tagged:creative-tools ← you loved Excalidraw`.

### 16.4 Operational fit

- **Deployment.** Our DB today is `postgres:17-alpine` in `docker-compose.yml`.
  Two adoption paths: (a) swap to the prebuilt `ghcr.io/evokoa/pggraph` image
  (PG 17), or (b) install the extension into the existing container via pgGraph's
  `install_into_docker_postgres.sh`. Either fits the Coolify/Compose model in
  `PLAN.md` §4; it's a Postgres image swap, not a new service.
- **Sync cadence.** Interactions change constantly, so the graph is eventually
  consistent. Mitigate with `graph.enable_sync()` (pg_cron) for the slow-moving
  structure (tags, destinations, similarity) and a **hybrid query**: use pgGraph
  for candidate *generation*, then a cheap live SQL pass for freshness-critical
  bits (exclude `seen` from the current session, confirm `status='approved'`).
- **Rebuildable.** If an artifact is ever stale/corrupt, `graph.build()` /
  `graph.projection_repair()` rebuild from source tables — no data at risk.

### 16.5 Phasing (slots into §13)

- **Phase 4a (experimental):** install the extension in a dev DB, register the
  existing tables, prototype proposals **1–3** (discovery/dedup/gap analysis)
  inside the curation pipeline. Pure upside, no user-facing risk.
- **Phase 4b:** add `destination_similarities` + `co_saved` edges; prototype
  proposals **5–6** behind a `RECOMMENDER=graph` flag, A/B against the SQL
  recommender on love/save rate.
- **Phase 5+:** graduate serendipity-by-distance (**7**) and explanation paths
  (**8**) once pgGraph is past alpha and the win is proven.
