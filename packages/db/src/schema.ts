/**
 * Wander database schema (Drizzle ORM, Postgres).
 *
 * Mirrors PRD §10 / PLAN §5. Column names are explicit snake_case so the SQL is
 * readable. Enums are sourced from @wander/shared so the database, API, and UI
 * always agree on the allowed values.
 */

import {
  CURATION_CANDIDATE_STATUSES,
  CURATION_RUN_STATUSES,
  CURATION_SOURCE_KINDS,
  DESTINATION_STATUSES,
  INTERACTION_TYPES,
  SOURCE_TYPES,
  USER_ROLES,
  type CandidateEnrichment,
  type CandidateRaw,
} from "@wander/shared";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/* ── Enums ─────────────────────────────────────────────────────────────── */

export const destinationStatusEnum = pgEnum(
  "destination_status",
  DESTINATION_STATUSES,
);
export const sourceTypeEnum = pgEnum("source_type", SOURCE_TYPES);
export const interactionTypeEnum = pgEnum(
  "interaction_type",
  INTERACTION_TYPES,
);
export const userRoleEnum = pgEnum("user_role", USER_ROLES);
export const curationSourceKindEnum = pgEnum(
  "curation_source_kind",
  CURATION_SOURCE_KINDS,
);
export const curationRunStatusEnum = pgEnum(
  "curation_run_status",
  CURATION_RUN_STATUSES,
);
export const curationCandidateStatusEnum = pgEnum(
  "curation_candidate_status",
  CURATION_CANDIDATE_STATUSES,
);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/* ── Users ─────────────────────────────────────────────────────────────── */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email"),
  displayName: text("display_name"),
  imageUrl: text("image_url"),
  role: userRoleEnum("role").notNull().default("user"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  ...timestamps,
});

/* ── Tags ──────────────────────────────────────────────────────────────── */

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ── Destinations ──────────────────────────────────────────────────────── */

export const destinations = pgTable(
  "destinations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull().unique(),
    domain: text("domain").notNull(),
    title: text("title").notNull(),
    hook: text("hook").notNull(),
    summary: text("summary"),
    imageUrl: text("image_url"),
    sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
    status: destinationStatusEnum("status").notNull().default("draft"),
    qualityScore: integer("quality_score").notNull().default(50),
    contentFlags: jsonb("content_flags")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("destinations_status_idx").on(t.status),
    index("destinations_domain_idx").on(t.domain),
    index("destinations_quality_idx").on(t.qualityScore),
  ],
);

export const destinationTags = pgTable(
  "destination_tags",
  {
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.destinationId, t.tagId] }),
    index("destination_tags_tag_idx").on(t.tagId),
  ],
);

/* ── User interests ────────────────────────────────────────────────────── */

export const userInterests = pgTable(
  "user_interests",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    weight: real("weight").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tagId] })],
);

/* ── Interactions ──────────────────────────────────────────────────────── */

export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    type: interactionTypeEnum("type").notNull(),
    context: jsonb("context").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("interactions_user_idx").on(t.userId),
    index("interactions_user_dest_idx").on(t.userId, t.destinationId),
    index("interactions_user_type_idx").on(t.userId, t.type),
  ],
);

/* ── Collections + saved ───────────────────────────────────────────────── */

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("collections_user_idx").on(t.userId)],
);

export const savedDestinations = pgTable(
  "saved_destinations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").references(() => collections.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("saved_user_dest_unique").on(t.userId, t.destinationId),
    index("saved_user_idx").on(t.userId),
  ],
);

/* ── Catalog imports (audit trail for seeds/imports) ───────────────────── */

export const catalogImports = pgTable("catalog_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  label: text("label"),
  total: integer("total").notNull().default(0),
  created: integer("created").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  importedByUserId: uuid("imported_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ── Curation engine (discovery → review → import) ─────────────────────── */

// Registry of source adapters so they can be enabled/disabled and rate-tuned
// without code changes (Curation Engine plan §8).
export const curationSources = pgTable("curation_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: text("source_id").notNull().unique(),
  kind: curationSourceKindEnum("kind").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  rateLimit: jsonb("rate_limit").$type<Record<string, unknown>>(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One discovery run (CLI or worker), with rolling counts for status polling.
export const curationRuns = pgTable("curation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedByUserId: uuid("started_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  sources: jsonb("sources")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  status: curationRunStatusEnum("status").notNull().default("pending"),
  discovered: integer("discovered").notNull().default(0),
  enriched: integer("enriched").notNull().default(0),
  accepted: integer("accepted").notNull().default(0),
  rejected: integer("rejected").notNull().default(0),
  imported: integer("imported").notNull().default(0),
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

// The durable frontier + candidate store. `status` is the engine's own
// lifecycle, distinct from `destinations.status`; a real destination is only
// created on import. `url` is the canonicalized key that makes dedup durable.
export const curationCandidates = pgTable(
  "curation_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull().unique(),
    domain: text("domain").notNull(),
    sourceId: text("source_id").notNull(),
    runId: uuid("run_id").references(() => curationRuns.id, {
      onDelete: "set null",
    }),
    raw: jsonb("raw")
      .$type<CandidateRaw>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    enriched: jsonb("enriched").$type<CandidateEnrichment>(),
    qualityScore: integer("quality_score").notNull().default(0),
    status: curationCandidateStatusEnum("status")
      .notNull()
      .default("discovered"),
    rejectReason: text("reject_reason"),
    destinationId: uuid("destination_id").references(() => destinations.id, {
      onDelete: "set null",
    }),
    // Future: `embedding vector(N)` (pgvector) for near-dup detection and
    // find_similar seed expansion — deferred per plan §9; not added now.
    ...timestamps,
  },
  (t) => [
    index("curation_candidates_status_idx").on(t.status),
    index("curation_candidates_domain_idx").on(t.domain),
    index("curation_candidates_source_idx").on(t.sourceId),
    index("curation_candidates_run_idx").on(t.runId),
    index("curation_candidates_quality_idx").on(t.qualityScore),
  ],
);

/* ── Relations (enables the relational query API: db.query.*) ──────────── */

export const usersRelations = relations(users, ({ many }) => ({
  interests: many(userInterests),
  interactions: many(interactions),
  saved: many(savedDestinations),
  collections: many(collections),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  destinationTags: many(destinationTags),
  userInterests: many(userInterests),
}));

export const destinationsRelations = relations(destinations, ({ many }) => ({
  destinationTags: many(destinationTags),
  interactions: many(interactions),
  saved: many(savedDestinations),
}));

export const destinationTagsRelations = relations(
  destinationTags,
  ({ one }) => ({
    destination: one(destinations, {
      fields: [destinationTags.destinationId],
      references: [destinations.id],
    }),
    tag: one(tags, {
      fields: [destinationTags.tagId],
      references: [tags.id],
    }),
  }),
);

export const userInterestsRelations = relations(userInterests, ({ one }) => ({
  user: one(users, {
    fields: [userInterests.userId],
    references: [users.id],
  }),
  tag: one(tags, {
    fields: [userInterests.tagId],
    references: [tags.id],
  }),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  user: one(users, {
    fields: [interactions.userId],
    references: [users.id],
  }),
  destination: one(destinations, {
    fields: [interactions.destinationId],
    references: [destinations.id],
  }),
}));

export const savedDestinationsRelations = relations(
  savedDestinations,
  ({ one }) => ({
    user: one(users, {
      fields: [savedDestinations.userId],
      references: [users.id],
    }),
    destination: one(destinations, {
      fields: [savedDestinations.destinationId],
      references: [destinations.id],
    }),
    collection: one(collections, {
      fields: [savedDestinations.collectionId],
      references: [collections.id],
    }),
  }),
);

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  saved: many(savedDestinations),
}));

export const curationRunsRelations = relations(curationRuns, ({ many }) => ({
  candidates: many(curationCandidates),
}));

export const curationCandidatesRelations = relations(
  curationCandidates,
  ({ one }) => ({
    run: one(curationRuns, {
      fields: [curationCandidates.runId],
      references: [curationRuns.id],
    }),
    destination: one(destinations, {
      fields: [curationCandidates.destinationId],
      references: [destinations.id],
    }),
  }),
);

/* ── Inferred row types ────────────────────────────────────────────────── */

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type DestinationRow = typeof destinations.$inferSelect;
export type NewDestinationRow = typeof destinations.$inferInsert;
export type TagRow = typeof tags.$inferSelect;
export type InteractionRow = typeof interactions.$inferSelect;
export type SavedRow = typeof savedDestinations.$inferSelect;
export type CurationSourceRow = typeof curationSources.$inferSelect;
export type NewCurationSourceRow = typeof curationSources.$inferInsert;
export type CurationRunRow = typeof curationRuns.$inferSelect;
export type NewCurationRunRow = typeof curationRuns.$inferInsert;
export type CurationCandidateRow = typeof curationCandidates.$inferSelect;
export type NewCurationCandidateRow = typeof curationCandidates.$inferInsert;
