# AGENTS.md — working notes for Wander

Context for anyone (human or agent) extending this repo. See `README.md` for
setup and `PRD.md` / `PLAN.md` for product scope.

## Commands

- Install: `pnpm install`
- Dev server: `pnpm dev` (Turbopack, port 3000)
- Type-check everything: `pnpm typecheck`
- Production build: `pnpm build` (uses `next build --webpack` — see gotchas)
- Format: `pnpm format` (Prettier)
- DB: `pnpm db:generate` → `pnpm db:migrate` → `pnpm db:seed` (Postgres via
  `docker compose up -d postgres`)
- Catalog images: `pnpm db:enrich` backfills `destinations.image_url` (OpenGraph
  first, hosted screenshot fallback). Flags: `--all`, `--og-only`,
  `--limit=N`, `--concurrency=N`. Screenshot provider is env-configurable
  (`SCREENSHOT_PROVIDER`, default Microlink free tier).
- Curation: `pnpm curate` runs the Curation Engine (discover → enrich → score →
  store as `needs_review` candidates). Flags: `--sources=a,b`, `--limit=N`,
  `--concurrency=N`, `--dry-run` (no DB writes), `--mock` (local fixture, zero
  external calls), `--auto-approve` (OFF by default; imports trusted high-score
  candidates directly). Runs without paid keys — adapters needing a key are
  skipped with a log line. Then review/import via `/admin` → Candidates tab.

Local curation loop: `docker compose up -d postgres` → `pnpm db:migrate` →
`pnpm curate --mock` (or with real `--sources`) → open `/admin`, Candidates tab,
approve into the live catalog → `pnpm db:enrich` to fill images on imports.

Always run `pnpm typecheck` before considering a change done. There is no ESLint
config yet; `tsc` + Prettier are the gate.

## Architecture

- **pnpm monorepo.** `apps/web` (Next.js) consumes `@wander/db` and
  `@wander/shared` via `transpilePackages` (they ship TS source, no build step).
- **`@wander/shared`** is the single source of truth for enums, the interest-tag
  taxonomy, DTO types, and Zod request schemas. Both API and UI import from it.
- **`@wander/db`** owns the Drizzle schema, the lazy `getDb()` client, the
  migrator, the seed catalog (`src/catalog/seed-catalog.ts`), the seed script,
  and the single destination import path (`src/import.ts`:
  `upsertDestinationWithTags` / `setDestinationTags` / `ensureTags`) reused by
  the API, the catalog seed, and the curation CLI.
- **`@wander/curation`** is the Curation Engine (plan: `CurationEnginePlan.md`).
  Pure TS, ships source like the other packages. Pipeline: source adapters
  (`src/sources/*`, API-first, browser only as fallback) → frontier
  (`canonicalizeUrl` dedup vs candidates + live `destinations`, per-domain caps,
  robots) → fetch (Browserbase Fetch fast lane, plain fetch fallback) → enrich
  (`resolveImage` + batched/heuristic LLM enrichment) → quality score + safety
  gate → `curation_candidates` (status `needs_review`). The CLI is `pnpm curate`.
  Approval (admin only) maps a candidate → `DestinationInput` and writes through
  the existing `upsertDestinationWithTags` path; the human gate is preserved.
- **Server lib** (`apps/web/lib`): `auth.ts` (Clerk↔DB user sync),
  `api.ts` (response envelope + Zod body parsing), `db-helpers.ts` (all
  data access + DTO mappers), `recommendation.ts` (the wander query),
  `analytics.ts` (structured event log), `client.ts` (browser API client).
- **Auth model:** the public app is fully anonymous — anyone can wander, save,
  and browse history without signing in. Personalization (interests, saved,
  history, the already-seen set) lives entirely in the browser via
  `apps/web/lib/local-store.ts` (localStorage), not the DB. `proxy.ts` runs bare
  `clerkMiddleware()`; **only `/admin` and `/api/v1/admin/*` require auth** (the
  `admin` role, enforced in `admin/layout.tsx` + each admin route handler).
  Admin is granted in `auth.ts` `resolveRole()` (recomputed on every sign-in):
  Clerk `publicMetadata.role==="admin"`, the `ADMIN_EMAILS` allowlist, an
  already-admin account, or — when no allowlist is set and no admin exists yet —
  the first signed-in user (zero-config bootstrap). The app shell exposes a
  discreet shield link to `/admin` (the only sign-in entry point).
  `(app)/layout.tsx` no longer gates on auth/onboarding. The `/api/v1/wander`
  endpoint is anonymous: the client passes `interests` + `exclude` (seen ids)
  from localStorage and the recommender biases on those. Sign-in/sign-up pages
  remain solely so admins can authenticate. DB tables for per-user
  personalization (`interactions`, `saved_destinations`, `user_interests`,
  `collections`) and their helpers in `db-helpers.ts`/`auth.ts` are retained but
  no longer used by the public app.

## Conventions

- Relative imports inside `packages/*` are **extensionless** (Bundler module
  resolution) so esbuild/tsx/Turbopack/webpack all resolve `.ts`.
- API routes set `export const runtime = "nodejs"` and
  `export const dynamic = "force-dynamic"`.
- Styling is Tailwind v4 utilities + tokens defined in
  `apps/web/app/globals.css` `@theme` (e.g. `bg-paper`, `text-ink`,
  `font-display`, `text-accent`, `text-compass`). No `tailwind.config.js`.
- Icons are hand-built SVGs in `components/icons.tsx` (no icon library).
- Don't add comments that restate code; keep them about "why".

## Gotchas (Next.js 16 + this stack)

- **Middleware file is `apps/web/proxy.ts`** (Next 16 renamed it from
  `middleware.ts`). `/api/health` is excluded from the matcher so healthchecks
  don't require Clerk.
- **`auth()` is async** (`await auth()`), and `ClerkProvider` goes inside
  `<body>`. `afterSignOutUrl` is set on `ClerkProvider`, not `UserButton`
  (Clerk v7 / Core 3).
- **Production build uses webpack** (`next build --webpack`). Turbopack standalone
  output had node_modules tracing bugs in 16.1–16.2; webpack is reliable.
- **`postgres` + `drizzle-orm` are bundled** into the server output (pure JS), so
  the standalone image needs no extra node_modules for the DB driver.
- **The app cannot serve pages without valid Clerk keys** (middleware validates
  the publishable key on every request). For DB-only smoke tests, hit
  `/api/health` (unauthenticated).
- **Docker migrations:** `apps/web/Dockerfile` esbuild-bundles `migrate.ts` and
  `seed.ts` to self-contained `.mjs` (with a `createRequire` banner so CJS deps
  can `require` Node built-ins). The entrypoint runs migrate (+ optional seed).

## Adding catalog destinations

- Built-in seed: edit `packages/db/src/catalog/seed-catalog.ts`, then
  `pnpm db:seed` (idempotent upsert by URL, re-links tags).
- At runtime: use `/admin` (create/edit/import JSON) — admin role required.
- Tags outside the 12-tag taxonomy are auto-created for destinations, but user
  interests are restricted to the known taxonomy.

## Data model quick reference

`users`, `tags`, `destinations`, `destination_tags`, `user_interests`,
`interactions`, `collections`, `saved_destinations`, `catalog_imports`,
`curation_sources`, `curation_runs`, `curation_candidates` (the engine's own
frontier/queue; distinct lifecycle from `destinations.status`).
Enums (in `@wander/shared`): destination status, source type, interaction type,
user role, curation source kind, curation run status, curation candidate status.
