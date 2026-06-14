# Wander

**Wander into wonder.** One tap, one beautiful destination at a time — a calm,
curated way to rediscover the most delightful corners of the web.

Wander is a responsive, installable web/PWA built as the MVP of the discovery
loop described in [`PRD.md`](./PRD.md), following the plan in [`PLAN.md`](./PLAN.md).

---

## Stack

| Concern        | Choice                                          |
| -------------- | ----------------------------------------------- |
| Framework      | Next.js 16 (App Router) + React 19              |
| Language       | TypeScript                                      |
| Monorepo       | pnpm workspaces                                 |
| Styling        | Tailwind CSS v4 (CSS-first `@theme`)            |
| UI primitives  | Radix UI, hand-styled                           |
| Motion         | Motion for React (`motion`)                     |
| Auth           | Clerk                                           |
| Database       | Postgres + Drizzle ORM                          |
| API            | Stable `/api/v1` route handlers                 |
| Recommendation | Tag-weighted Postgres query (v0, no embeddings) |
| Deploy         | Docker Compose (Coolify) + optional Cloudflared |

The design language is **warm editorial / indie-web**: cream paper, a Fraunces
display serif, terracotta + teal accents drawn from the compass brand mark.

---

## Repository layout

```text
apps/
  web/                 Next.js app (UI, /api/v1, PWA, Clerk, Dockerfile)
    app/               routes (pages + API)
    components/        UI components
    lib/               auth, api, db-helpers, recommendation, client, utils
    public/            icons, manifest assets, service worker
packages/
  db/                  Drizzle schema, client, migrations, seed catalog + script
  shared/              shared enums, tags, DTO types, Zod validation
  config/              shared TypeScript config
docker-compose.yml     postgres + app (+ optional cloudflared)
PRD.md / PLAN.md       product + implementation plans
```

---

## Local development

### Prerequisites

- Node ≥ 20 (tested on 24)
- pnpm 10 (`corepack enable`)
- Docker (for Postgres)

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

Copy the example and fill in your Clerk keys:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Create a free application at <https://dashboard.clerk.com>, then paste the
**test** keys from the API Keys page into `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgres://wander:wander@localhost:5432/wander
```

> The app **requires** valid Clerk keys to render any page (auth middleware runs
> on every route except `/api/health`).

### 3. Start Postgres + set up the database

```bash
docker compose up -d postgres   # Postgres on localhost:5432
pnpm db:migrate                 # apply schema
pnpm db:seed                    # load the curated seed catalog (54 destinations)
```

### 4. Run the app

```bash
pnpm dev                        # http://localhost:3000 (Turbopack)
```

Sign up, pick a few interests, and start wandering.

### 5. Become an admin (optional)

The catalog admin at `/admin` is gated on a Clerk role. In the Clerk dashboard,
open your user → **Metadata → Public** and set:

```json
{ "role": "admin" }
```

Re-sign-in (the role syncs to the local user row on next request).

---

## Scripts

| Command            | What it does                                     |
| ------------------ | ------------------------------------------------ |
| `pnpm dev`         | Run the web app (Turbopack dev server)           |
| `pnpm build`       | Production build (webpack → standalone output)   |
| `pnpm start`       | Start the production server                      |
| `pnpm typecheck`   | Type-check every workspace package               |
| `pnpm format`      | Prettier across the repo                         |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate`  | Apply pending migrations                         |
| `pnpm db:seed`     | Seed/refresh the catalog (idempotent)            |
| `pnpm db:studio`   | Open Drizzle Studio                              |

---

## API (`/api/v1`)

Stable internal API so future native clients can reuse the backend contract.
All responses use an `{ ok, data } | { ok, error }` envelope.

| Method | Path                                    | Purpose                           |
| ------ | --------------------------------------- | --------------------------------- |
| GET    | `/api/v1/me`                            | Current user profile              |
| PATCH  | `/api/v1/me/interests`                  | Set interests / finish onboarding |
| POST   | `/api/v1/wander`                        | Next discovery card               |
| POST   | `/api/v1/destinations/:id/interactions` | Record love/skip/visit/report     |
| GET    | `/api/v1/saved` · POST `/api/v1/saved`  | List / add saved                  |
| DELETE | `/api/v1/saved/:destinationId`          | Remove saved                      |
| GET    | `/api/v1/history`                       | Recently seen destinations        |
| —      | `/api/v1/admin/*`                       | Catalog management (admin only)   |
| GET    | `/api/health`                           | Liveness + DB probe (no auth)     |

Recommendation v0 lives in `apps/web/lib/recommendation.ts`: it scores approved,
unseen destinations by `quality + interest-tag match + loved/saved affinity +
serendipity − skipped-tag penalty`.

---

## Deployment (Coolify / Docker Compose)

The root `docker-compose.yml` is a single, self-contained stack: **app**
(Next.js standalone; runs migrations on boot), **postgres**, and **cloudflared**
(the public ingress). The one-shot Curation Engine **curator** worker is behind
the `curator` profile so it never runs as part of the default deploy.

**Coolify:** point a "Docker Compose" resource at this `docker-compose.yml` and
set every variable in Coolify's Environment Variables UI (Coolify substitutes
the `${VARS}`). Ingress is the Cloudflare Tunnel — in the Cloudflare Zero Trust
dashboard, route the tunnel's public hostname to the internal service
`http://app:3000`. No host ports are published; Postgres stays internal.

```bash
docker compose up -d --build        # app + postgres + cloudflared
docker compose --profile curator run --rm curator --limit=200   # optional run
```

- **First deploy:** set `WANDER_SEED_ON_START=true` once to seed the catalog on
  boot (idempotent), then unset it.
- **Cloudflared tunnel:** set `CLOUDFLARED_TUNNEL_TOKEN`; the sidecar runs by
  default and connects to `app:3000` over the compose network.
- **Healthcheck:** the container reports healthy via `GET /api/health`.

For **local development** you only need the database:
`docker compose up -d postgres` (bound to `127.0.0.1:5432`) then `pnpm dev`.

### Environment variables

| Variable                                    | Used by        | Notes                                |
| ------------------------------------------- | -------------- | ------------------------------------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`         | app            | Clerk publishable key                |
| `CLERK_SECRET_KEY`                          | app            | Clerk secret key                     |
| `DATABASE_URL`                              | app, tooling   | Postgres connection string           |
| `POSTGRES_USER/PASSWORD/DB`                 | postgres       | Compose database credentials         |
| `WANDER_SEED_ON_START`                      | app entrypoint | Seed catalog on boot when `true`     |
| `CLOUDFLARED_TUNNEL_TOKEN`                  | cloudflared    | Public ingress; routes to `app:3000` |
| `EXA_API_KEY`                               | curator        | Optional — neural search/discovery   |
| `BROWSERBASE_API_KEY` / `_PROJECT_ID`       | curator        | Optional — fetch + browser lane      |
| `CURATION_MODEL` / `_API_KEY` / `_BASE_URL` | curator        | Optional — LLM enrichment            |

---

## Notes

- Built for Next.js 16: the Clerk middleware lives in `apps/web/proxy.ts`.
- Production builds use `next build --webpack` for reliable standalone tracing.
- Generated with care; see `PRD.md` / `PLAN.md` for scope and roadmap.
