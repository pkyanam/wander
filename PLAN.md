# Wander Implementation Plan

Version: 0.1
Date: June 13, 2026
Status: Initial build plan

## 1. Stack Decision

Wander v0 will be built as a responsive, installable web/PWA first. Native iOS and Android can come later after the product loop is proven.

Chosen stack:

- App framework: Next.js App Router
- Language: TypeScript
- Package manager: pnpm workspaces
- Styling: Tailwind CSS v4 with CSS custom properties
- UI primitives: Radix UI, styled in-app
- Animation: Motion for React from motion.dev
- Auth: Clerk
- Database: Postgres
- ORM: Drizzle
- API: stable `/api/v1` routes inside the Next.js app
- Recommendation v0: tag-weighted Postgres queries
- PWA: installable responsive web app
- Deployment: Docker Compose through Coolify
- Tunnel/edge: embedded Cloudflared sidecar in the Coolify deployment

Deferred until needed:

- Valkey/Redis cache
- Background worker service
- Object storage
- pgvector / embeddings
- Native mobile apps
- Public submissions
- Advanced AI enrichment pipeline

## 2. Product Direction Constraints

- Build the actual app experience first, not a marketing site.
- The core screen should be the Wander discovery loop.
- Prioritize performance, responsiveness, and tactile motion.
- Use Motion intentionally for transitions, gestures, and feedback.
- Avoid loud gradients, generic SaaS visuals, and decorative bloat.
- Use distinctive typography through self-hosted or package-managed font assets.
- Generate raster brand/product assets one by one in chat with the `imagegen` workflow when needed.
- Keep generated project assets inside the repo once selected.

## 3. Initial Monorepo Shape

```text
apps/
  web/
    app/
    components/
    lib/
    public/
    styles/
packages/
  db/
  shared/
  config/
docs/
  decisions/
  research/
docker-compose.yml
PRD.md
PLAN.md
```

Package responsibilities:

- `apps/web`: Next.js app, PWA, route handlers, UI, Clerk integration.
- `packages/db`: Drizzle schema, migrations, database client.
- `packages/shared`: shared types, constants, tag definitions, validation schemas.
- `packages/config`: shared TypeScript, lint, formatting, and Tailwind-related config if useful.

This shape can be simplified if setup friction is too high, but the boundaries should remain clear.

## 4. Deployment Shape

Initial Coolify-oriented services:

```text
app
postgres
cloudflared
```

Later services:

```text
valkey
worker
object-storage
```

The app container should run the production Next.js server using standalone output where practical.

Environment groups:

- App: `NEXT_PUBLIC_*`, Clerk keys, app URL, database URL
- Database: Postgres user, password, database
- Cloudflared: tunnel token/config

## 5. Data Model v0

Initial tables:

- users
- destinations
- tags
- destination_tags
- user_interests
- interactions
- collections
- saved_destinations
- catalog_imports

Important enums:

- destination status: `draft`, `approved`, `needs_review`, `rejected`, `archived`
- source type: `seed`, `admin_import`, `user_submission`, `api_ingestion`
- interaction type: `viewed`, `loved`, `skipped`, `saved`, `unsaved`, `visited`, `reported`

Clerk remains the identity provider. The app database stores an internal user row keyed to Clerk user ID.

## 6. API v0

Stable internal API routes should be created under `/api/v1` so future native apps can reuse the backend contract.

Initial endpoints:

- `GET /api/v1/me`
- `PATCH /api/v1/me/interests`
- `POST /api/v1/wander`
- `POST /api/v1/destinations/:id/interactions`
- `GET /api/v1/saved`
- `POST /api/v1/saved`
- `DELETE /api/v1/saved/:destinationId`
- `GET /api/v1/history`

Admin endpoints can be added under `/api/v1/admin/*` and protected by Clerk role/metadata checks.

## 7. Recommendation v0

Recommendation v0 is intentionally simple and inspectable.

Inputs:

- approved destination status
- user interest tags
- destination quality score
- prior user interactions
- recently seen destinations

Behavior:

- exclude archived/rejected/draft destinations
- avoid recently viewed destinations
- boost selected interest tags
- boost high quality score
- down-rank repeatedly skipped tags/domains
- include controlled exploration outside the user's interests

No embeddings are required for v0.

## 8. Build Phases

### Phase 0: Repository Foundation

- Create pnpm workspace
- Scaffold Next.js app
- Add TypeScript, linting, formatting
- Add Tailwind CSS
- Add Motion for React
- Add Radix UI
- Add base Dockerfile and Compose
- Add initial environment examples

### Phase 1: Data Foundation

- Add Postgres service
- Add Drizzle
- Define schema
- Add migrations
- Add database client
- Add seed catalog format
- Add seed script with a tiny sample catalog

### Phase 2: Auth and User Setup

- Add Clerk
- Create app shell
- Sync Clerk user to internal user row
- Add protected routes
- Add onboarding interest picker
- Persist user interests

### Phase 3: Core Wander Loop

- Build main responsive Wander screen
- Implement `POST /api/v1/wander`
- Render destination preview card
- Add Love, Skip, Save, Visit controls
- Record interactions
- Add motion transitions between cards
- Add loading, empty, and error states

### Phase 4: Saved and History

- Add Saved view
- Add History view
- Support unsave
- Support revisiting destination
- Ensure mobile layout is polished

### Phase 5: Admin Seed Management

- Add protected admin route
- List catalog destinations
- Add/edit basic destination metadata
- Approve/archive destinations
- Import seed data

### Phase 6: PWA and Deployment

- Add manifest
- Add icons and app metadata
- Add service worker/offline shell
- Tune caching
- Finalize Docker Compose for Coolify
- Add Cloudflared sidecar notes/config placeholders
- Smoke test production build locally

### Phase 7: Polish Pass

- Typography pass
- Motion pass
- Accessibility pass
- Performance pass
- Responsive QA
- Initial generated visual assets, one at a time

## 9. First Implementation Milestone

Milestone 1 is complete when:

- The repo has a working pnpm monorepo.
- The web app runs locally.
- The app has base styling, app shell, and routing.
- Docker build succeeds.
- Compose can start app and Postgres.
- The project has placeholders for required environment variables.

No product features need to be complete in Milestone 1.

## 10. Open Decisions

- Exact font choices
- Exact color system
- Whether Clerk roles or metadata will gate admin access
- Initial seed catalog file format: JSON, CSV, or TypeScript fixture
- Offline scope: shell-only or saved/history offline support
- Whether analytics v0 is a dedicated events table or console/logging until first test users
- Whether Visit opens in a new tab first or an app viewer route first

## 11. Current Decisions

- Use Next.js App Router.
- Use Clerk for auth.
- Use Postgres and Drizzle.
- Use Motion for React.
- Use Tailwind CSS v4.
- Use Radix UI primitives.
- Build `/api/v1` route handlers for future native clients.
- Deploy with Coolify using Docker Compose.
- Keep the first app responsive and installable as a PWA.
