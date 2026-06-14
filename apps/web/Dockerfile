# syntax=docker/dockerfile:1
# Wander — multi-stage build producing a self-contained Next.js standalone image.
# Build context is the monorepo root: `docker build -f apps/web/Dockerfile .`

# ── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ── Dependencies (full install for the build) ───────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/web/package.json ./apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app ./
COPY . .
# Build the Next.js standalone output (webpack → reliable standalone tracing).
RUN pnpm --filter @wander/web build
# Bundle self-contained migrate + seed scripts the slim runtime can run with node.
# The createRequire banner lets the ESM bundle satisfy CJS deps that require()
# Node built-ins (dotenv/postgres) instead of throwing "Dynamic require".
ARG ESBUILD_BANNER="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
RUN pnpm --filter @wander/db exec esbuild src/migrate.ts \
      --bundle --platform=node --format=esm --packages=bundle \
      --banner:js="$ESBUILD_BANNER" --outfile=/app/migrate.mjs
RUN pnpm --filter @wander/db exec esbuild src/seed.ts \
      --bundle --platform=node --format=esm --packages=bundle \
      --banner:js="$ESBUILD_BANNER" --outfile=/app/seed.mjs

# ── Runner (slim, non-root) ─────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV MIGRATIONS_DIR=/app/drizzle
WORKDIR /app

# Next.js standalone server + assets
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public
# Migration tooling (self-contained)
COPY --from=builder --chown=node:node /app/migrate.mjs ./migrate.mjs
COPY --from=builder --chown=node:node /app/seed.mjs ./seed.mjs
COPY --from=builder --chown=node:node /app/packages/db/drizzle ./drizzle
COPY --chown=node:node apps/web/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["./docker-entrypoint.sh"]
