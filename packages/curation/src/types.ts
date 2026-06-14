/**
 * Core engine interfaces. `RawCandidate` is the discovery-time shape a source
 * adapter yields (no enrichment); the pipeline enriches/scores/stores it.
 */

import type { CurationSourceKind } from "@wander/shared";
import type { CurationConfig } from "./config";

export interface RawCandidate {
  url: string;
  sourceId: string;
  rawTitle?: string;
  rawTags?: string[];
  hintScore?: number;
  discoveredVia?: string;
}

export type Logger = (msg: string) => void;

export interface SourceContext {
  /** Soft cap on how many candidates this source should yield. */
  limit: number;
  /** Offline mode: adapters must not make external calls. */
  mock: boolean;
  config: CurationConfig;
  log: Logger;
}

export interface Source {
  id: string;
  kind: CurationSourceKind;
  /** True when the source can run with the current config (keys present etc.). */
  available(ctx: SourceContext): boolean;
  /** Stream raw candidates. Implementations page/limit internally. */
  discover(ctx: SourceContext): AsyncIterable<RawCandidate>;
}
