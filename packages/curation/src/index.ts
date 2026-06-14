/**
 * Public surface of the Wander Curation Engine. The CLI (`src/cli.ts`) is the
 * primary entrypoint; these exports let a future worker/service drive the same
 * pipeline programmatically.
 */

export { runCuration, type RunOptions, type RunSummary } from "./pipeline";
export { loadConfig, type CurationConfig } from "./config";
export { SOURCES, DEFAULT_SOURCES, resolveSources } from "./sources/registry";
export type { RawCandidate, Source, SourceContext } from "./types";
