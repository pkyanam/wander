/**
 * Product analytics event names (PRD §11). For v0 these are captured into the
 * `interactions` table and/or logged; the constant list keeps event names
 * consistent so a real analytics sink can be wired in later without renaming.
 */

export const ANALYTICS_EVENTS = [
  "account_created",
  "onboarding_completed",
  "wander_requested",
  "destination_viewed",
  "destination_loved",
  "destination_skipped",
  "destination_saved",
  "destination_unsaved",
  "destination_visited",
  "session_started",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
