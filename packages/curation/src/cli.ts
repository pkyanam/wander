/**
 * `pnpm curate` — runs one discovery pass. Mirrors the db scripts' ergonomics
 * (dotenv from the web app's .env.local, then a local .env). Flags:
 *   --sources=exa-search,arena   which adapters to run (default: API-first set)
 *   --limit=200                  max new candidates this run
 *   --concurrency=8              bounded parallelism for fetch/enrich
 *   --dry-run                    discover + enrich + score, no DB writes
 *   --mock                       offline fixture, zero external calls
 *   --auto-approve               import trusted high-score candidates (OFF)
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { runCuration } from "./pipeline";
import { createLogger } from "./util";

config({ path: resolve(process.cwd(), "../../apps/web/.env.local") });
config({ path: resolve(process.cwd(), ".env") });

interface CliOptions {
  sources?: string[];
  limit: number;
  concurrency: number;
  dryRun: boolean;
  mock: boolean;
  autoApprove: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    limit: 100,
    concurrency: 8,
    dryRun: false,
    mock: false,
    autoApprove: false,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--mock") opts.mock = true;
    else if (arg === "--auto-approve") opts.autoApprove = true;
    else if (arg.startsWith("--sources=")) {
      opts.sources = arg
        .slice("--sources=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) opts.limit = Math.floor(n);
    } else if (arg.startsWith("--concurrency=")) {
      const n = Number(arg.slice("--concurrency=".length));
      if (Number.isFinite(n) && n > 0) opts.concurrency = Math.floor(n);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const log = createLogger();

  const summary = await runCuration({ ...opts, log });

  log(
    `done — discovered=${summary.discovered} enriched=${summary.enriched} ` +
      `accepted(needs_review)=${summary.accepted} rejected=${summary.rejected} ` +
      `imported=${summary.imported}` +
      (summary.runId ? ` run=${summary.runId}` : " (dry-run, no writes)"),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[curate] failed:", err);
    process.exit(1);
  });
