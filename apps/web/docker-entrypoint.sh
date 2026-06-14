#!/bin/sh
set -e

echo "[wander] applying database migrations..."
node /app/migrate.mjs

if [ "$WANDER_SEED_ON_START" = "true" ]; then
  echo "[wander] seeding catalog (WANDER_SEED_ON_START=true)..."
  node /app/seed.mjs || echo "[wander] seed step failed; continuing to start server"
fi

echo "[wander] starting Next.js server on :${PORT:-3000}"
exec node /app/apps/web/server.js
