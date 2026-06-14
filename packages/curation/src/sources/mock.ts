import { MOCK_CANDIDATES } from "../fixtures/mock-candidates";
import type { Source } from "../types";

/** Offline fixture source. Always available; makes no external calls. */
export const mockSource: Source = {
  id: "mock",
  kind: "api",
  available: () => true,
  async *discover(ctx) {
    let n = 0;
    for (const candidate of MOCK_CANDIDATES) {
      if (n >= ctx.limit) break;
      n += 1;
      yield candidate;
    }
  },
};
