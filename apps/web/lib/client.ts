import type {
  ApiResponse,
  CatalogImportInput,
  CurationCandidateDTO,
  CurationRunDTO,
  DestinationAdmin,
  DestinationCard,
  DestinationInput,
  DestinationUpdateInput,
  HistoryItem,
  InteractionType,
  SavedItem,
  StartCurationRunInput,
  UserProfile,
} from "@wander/shared";

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("network", `Unexpected response (${res.status}).`);
  }
  if (!json.ok) throw new ApiError(json.error.code, json.error.message);
  return json.data;
}

export interface WanderResult {
  card: DestinationCard | null;
  exhausted: boolean;
}

/** Typed client for the /api/v1 surface, used by browser components. */
export const api = {
  me: () => request<UserProfile>("/api/v1/me"),

  updateInterests: (interests: string[]) =>
    request<UserProfile>("/api/v1/me/interests", {
      method: "PATCH",
      body: JSON.stringify({ interests }),
    }),

  wander: (exclude: string[] = []) =>
    request<WanderResult>("/api/v1/wander", {
      method: "POST",
      body: JSON.stringify({ exclude }),
    }),

  interact: (
    destinationId: string,
    type: InteractionType,
    context?: Record<string, unknown>,
  ) =>
    request<{ recorded: true }>(
      `/api/v1/destinations/${destinationId}/interactions`,
      { method: "POST", body: JSON.stringify({ type, context }) },
    ),

  save: (destinationId: string) =>
    request<{ saved: true; card: DestinationCard }>("/api/v1/saved", {
      method: "POST",
      body: JSON.stringify({ destinationId }),
    }),

  unsave: (destinationId: string) =>
    request<{ removed: true }>(`/api/v1/saved/${destinationId}`, {
      method: "DELETE",
    }),

  saved: () => request<{ items: SavedItem[] }>("/api/v1/saved"),

  history: () => request<{ items: HistoryItem[] }>("/api/v1/history"),
};

export interface AdminListResult {
  items: DestinationAdmin[];
  counts: Record<string, number>;
}

/** Admin-only catalog operations. */
export const adminApi = {
  list: (params: { status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status && params.status !== "all")
      qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    const query = qs.toString();
    return request<AdminListResult>(
      `/api/v1/admin/destinations${query ? `?${query}` : ""}`,
    );
  },

  create: (input: DestinationInput) =>
    request<{ item: DestinationAdmin; created: boolean }>(
      "/api/v1/admin/destinations",
      { method: "POST", body: JSON.stringify(input) },
    ),

  update: (id: string, patch: DestinationUpdateInput) =>
    request<{ item: DestinationAdmin }>(`/api/v1/admin/destinations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  import: (payload: CatalogImportInput) =>
    request<{ total: number; created: number; updated: number }>(
      "/api/v1/admin/import",
      { method: "POST", body: JSON.stringify(payload) },
    ),
};

export interface CandidateListResult {
  items: CurationCandidateDTO[];
  counts: Record<string, number>;
}

/** Admin-only curation review operations (`/api/v1/admin/curation/*`). */
export const curationApi = {
  candidates: (
    params: {
      status?: string;
      q?: string;
      sourceId?: string;
      minQuality?: number;
      limit?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.status && params.status !== "all")
      qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    if (params.sourceId) qs.set("sourceId", params.sourceId);
    if (typeof params.minQuality === "number")
      qs.set("minQuality", String(params.minQuality));
    if (params.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return request<CandidateListResult>(
      `/api/v1/admin/curation/candidates${query ? `?${query}` : ""}`,
    );
  },

  approve: (id: string, overrides?: Partial<DestinationInput>) =>
    request<{ destinationId: string; candidate: CurationCandidateDTO }>(
      `/api/v1/admin/curation/candidates/${id}/approve`,
      { method: "POST", body: JSON.stringify({ overrides }) },
    ),

  reject: (id: string, reason?: string) =>
    request<{ candidate: CurationCandidateDTO }>(
      `/api/v1/admin/curation/candidates/${id}/reject`,
      { method: "POST", body: JSON.stringify({ reason }) },
    ),

  bulkApprove: (ids: string[]) =>
    request<{ imported: number; created: number; skipped: number }>(
      "/api/v1/admin/curation/candidates/bulk-approve",
      { method: "POST", body: JSON.stringify({ ids }) },
    ),

  startRun: (input: StartCurationRunInput) =>
    request<{ run: CurationRunDTO }>("/api/v1/admin/curation/runs", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  run: (id: string) =>
    request<{ run: CurationRunDTO }>(`/api/v1/admin/curation/runs/${id}`),
};
