/**
 * Fetch / render. Cheapest first (plan §3/§6.3): the Browserbase Fetch API fast
 * lane when configured, otherwise a plain bounded `fetch()`. The browser lane
 * (Sessions + Stagehand) lives in the showcase adapter, not here.
 */

import { hasBrowserbase, type CurationConfig } from "./config";
import { fetchWithTimeout } from "./util";

const USER_AGENT = "WanderBot/0.1 (+https://wander.app; curation discovery)";

export interface PageResult {
  ok: boolean;
  status: number;
  html: string;
}

const EMPTY: PageResult = { ok: false, status: 0, html: "" };

/** Read at most `maxBytes` of a response as text, stopping after </head>. */
async function readBounded(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let out = "";
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      out += decoder.decode(value, { stream: true });
      if (out.includes("</head>")) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return out;
}

async function fetchDirect(
  url: string,
  config: CurationConfig,
): Promise<PageResult> {
  const res = await fetchWithTimeout(
    url,
    {
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" },
    },
    config.fetchTimeoutMs,
  );
  if (!res) return EMPTY;
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.includes("html")) {
    return { ok: res.ok, status: res.status, html: "" };
  }
  const html = await readBounded(res, 512 * 1024);
  return { ok: true, status: res.status, html };
}

/**
 * Browserbase Fetch API: URL → HTML in one call, no session. Best-effort; any
 * failure falls back to a direct fetch so a flaky fast lane never blocks a run.
 */
async function fetchViaBrowserbase(
  url: string,
  config: CurationConfig,
): Promise<PageResult> {
  const res = await fetchWithTimeout(
    "https://api.browserbase.com/v1/fetch",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bb-api-key": config.browserbaseApiKey!,
      },
      body: JSON.stringify({
        url,
        projectId: config.browserbaseProjectId,
        format: "html",
      }),
    },
    config.fetchTimeoutMs,
  );
  if (!res || !res.ok) return fetchDirect(url, config);
  try {
    const json = (await res.json()) as { html?: string; content?: string };
    const html = json.html ?? json.content ?? "";
    if (!html) return fetchDirect(url, config);
    return { ok: true, status: 200, html };
  } catch {
    return fetchDirect(url, config);
  }
}

export async function fetchPage(
  url: string,
  config: CurationConfig,
): Promise<PageResult> {
  if (hasBrowserbase(config)) return fetchViaBrowserbase(url, config);
  return fetchDirect(url, config);
}
