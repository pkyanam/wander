import type { AnalyticsEvent } from "@wander/shared";

/**
 * Analytics v0 (PRD §11). Behavioural signals already live in the `interactions`
 * table; this is a lightweight, structured event log on top. Swap the sink here
 * (PostHog, a queue, an events table, …) without touching call sites.
 */
export function track(
  event: AnalyticsEvent,
  props: Record<string, unknown> = {},
): void {
  const payload = {
    kind: "analytics" as const,
    event,
    ts: new Date().toISOString(),
    ...props,
  };
  // Structured single-line JSON so it's greppable in container logs.
  console.log(JSON.stringify(payload));
}
