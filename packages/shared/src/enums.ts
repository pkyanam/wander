/**
 * Canonical enums shared across the database, API, and UI.
 * Defined as `as const` arrays so they can be used for both runtime validation
 * (e.g. Zod, Drizzle pgEnum) and static types.
 */

export const DESTINATION_STATUSES = [
  "draft",
  "needs_review",
  "approved",
  "rejected",
  "archived",
] as const;
export type DestinationStatus = (typeof DESTINATION_STATUSES)[number];

export const SOURCE_TYPES = [
  "seed",
  "admin_import",
  "user_submission",
  "api_ingestion",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const INTERACTION_TYPES = [
  "viewed",
  "loved",
  "skipped",
  "saved",
  "unsaved",
  "visited",
  "reported",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Interaction types that represent a positive preference signal. */
export const POSITIVE_INTERACTIONS: InteractionType[] = [
  "loved",
  "saved",
  "visited",
];

/** Interaction types that represent a negative preference signal. */
export const NEGATIVE_INTERACTIONS: InteractionType[] = ["skipped", "reported"];

/** Interaction types that mean "the user has seen this card" and it should not be re-shown. */
export const SEEN_INTERACTIONS: InteractionType[] = [
  "viewed",
  "loved",
  "skipped",
  "visited",
];
