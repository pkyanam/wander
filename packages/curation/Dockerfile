# syntax=docker/dockerfile:1
# Wander Curation Engine — worker image.
# Mirrors apps/web/Dockerfile: esbuild-bundles the curate entrypoint to a
# self-contained .mjs (with the createRequire banner so the ESM bundle can
# satisfy CJS deps that require() Node built-ins), so the runtime needs no
# node_modules. Build context is the monorepo root:
#   docker build -f packages/curation/Dockerfile .

# ── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ── Dependencies (full install for the bundle) ──────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/curation/package.json ./packages/curation/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app ./
COPY . .
# The createRequire banner lets the ESM bundle satisfy CJS deps that require()
# Node built-ins (dotenv/postgres) instead of throwing "Dynamic require".
ARG ESBUILD_BANNER="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
RUN pnpm --filter @wander/curation exec esbuild src/cli.ts \
      --bundle --platform=node --format=esm --packages=bundle \
      --banner:js="$ESBUILD_BANNER" --outfile=/app/curate.mjs

# ── Runner (slim, non-root) ─────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /app/curate.mjs ./curate.mjs

USER node

# One-shot worker: runs a discovery pass and exits. Coolify/compose can override
# the args (e.g. --sources=exa,browserbase-search --limit=200) or schedule it.
# With no provider keys configured it skips those adapters and no-ops cleanly.
ENTRYPOINT ["node", "/app/curate.mjs"]
