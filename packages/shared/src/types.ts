/**
 * Shared data-transfer types for the Wander API surface (`/api/v1`).
 * These describe the JSON shapes exchanged between the server and clients
 * (web today, native later), independent of the database row types.
 */

import type {
  DestinationStatus,
  InteractionType,
  SourceType,
  UserRole,
} from "./enums";

export interface TagDTO {
  slug: string;
  label: string;
}

export interface DestinationCard {
  id: string;
  url: string;
  domain: string;
  title: string;
  hook: string;
  summary: string | null;
  imageUrl: string | null;
  tags: TagDTO[];
  sourceType: SourceType;
  qualityScore: number;
}

/** Full destination shape used by admin surfaces. */
export interface DestinationAdmin extends DestinationCard {
  status: DestinationStatus;
  contentFlags: string[];
  createdAt: string;
  updatedAt: string;
  lastCheckedAt: string | null;
}

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  imageUrl: string | null;
  role: UserRole;
  onboarded: boolean;
  interests: string[];
}

export interface SavedItem {
  destination: DestinationCard;
  savedAt: string;
}

export interface HistoryItem {
  destination: DestinationCard;
  type: InteractionType;
  at: string;
}

/** Standard API envelope so clients can branch on `ok` reliably. */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
