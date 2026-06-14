/**
 * Zod schemas validating every `/api/v1` request body. Importing these in both
 * the route handlers and (optionally) the client keeps the contract honest.
 */

import { z } from "zod";
import { DESTINATION_STATUSES, INTERACTION_TYPES, SOURCE_TYPES } from "./enums";
import { INTEREST_TAG_SLUGS } from "./tags";

const tagSlug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "tags must be lowercase kebab-case");

/** PATCH /api/v1/me/interests */
export const updateInterestsSchema = z.object({
  interests: z.array(tagSlug).max(64),
});
export type UpdateInterestsInput = z.infer<typeof updateInterestsSchema>;

/** POST /api/v1/wander */
export const wanderRequestSchema = z.object({
  // Client may pass IDs already shown this session so we never repeat them
  // even before interactions are persisted.
  exclude: z.array(z.uuid()).max(200).optional(),
});
export type WanderRequestInput = z.infer<typeof wanderRequestSchema>;

/** POST /api/v1/destinations/:id/interactions */
export const interactionSchema = z.object({
  type: z.enum(INTERACTION_TYPES),
  // Optional lightweight context, e.g. { dwellMs: 4200 }.
  context: z.record(z.string(), z.unknown()).optional(),
});
export type InteractionInput = z.infer<typeof interactionSchema>;

/** POST /api/v1/saved */
export const saveSchema = z.object({
  destinationId: z.uuid(),
});
export type SaveInput = z.infer<typeof saveSchema>;

/** Admin: create / update a destination */
export const destinationInputSchema = z.object({
  url: z.url().max(2048),
  title: z.string().min(1).max(280),
  hook: z.string().min(1).max(400),
  summary: z.string().max(4000).nullish(),
  imageUrl: z.url().max(2048).nullish(),
  tags: z.array(tagSlug).max(24).default([]),
  sourceType: z.enum(SOURCE_TYPES).default("seed"),
  status: z.enum(DESTINATION_STATUSES).default("draft"),
  qualityScore: z.number().int().min(0).max(100).default(50),
  contentFlags: z.array(z.string().max(64)).max(24).default([]),
});
export type DestinationInput = z.infer<typeof destinationInputSchema>;

export const destinationUpdateSchema = destinationInputSchema.partial();
export type DestinationUpdateInput = z.infer<typeof destinationUpdateSchema>;

/** Admin: bulk import (the seed catalog file format). */
export const catalogImportSchema = z.object({
  source: z.string().max(120).default("admin_import"),
  destinations: z.array(destinationInputSchema).min(1).max(5000),
});
export type CatalogImportInput = z.infer<typeof catalogImportSchema>;

export { INTEREST_TAG_SLUGS };
