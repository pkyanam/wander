import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Monorepo root — required so standalone output traces workspace packages.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const nextConfig: NextConfig = {
  // Self-contained server build for the Docker/Coolify image.
  output: "standalone",
  outputFileTracingRoot: repoRoot,

  // Workspace packages ship TypeScript source; let Next compile them.
  transpilePackages: ["@wander/db", "@wander/shared"],

  // postgres.js + drizzle are pure JS, so we let them bundle into the server
  // output. This keeps the standalone image self-contained (no extra
  // node_modules tracing needed for the DB driver).

  reactStrictMode: true,

  // We render destination imagery with a typographic fallback + favicons via
  // plain <img>, so Next's image optimizer (and sharp) isn't needed.
  images: { unoptimized: true },

  async headers() {
    return [
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default nextConfig;
