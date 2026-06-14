/**
 * The canonical interest tag taxonomy for Wander v0.
 *
 * These power onboarding interest selection, destination tagging, and the
 * tag-weighted recommendation engine. Slugs are stable identifiers and must
 * not change once destinations reference them. Labels are display strings.
 */

export interface TagDefinition {
  /** Stable, lowercase, kebab-case identifier. Never change after launch. */
  slug: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Short helper text for onboarding chips. */
  blurb: string;
}

export const INTEREST_TAGS: readonly TagDefinition[] = [
  {
    slug: "technology",
    label: "Technology",
    blurb: "Tools, systems, and the people building them",
  },
  {
    slug: "design",
    label: "Design",
    blurb: "Visual craft, typography, and interface ideas",
  },
  {
    slug: "science",
    label: "Science",
    blurb: "Explainers, research, and the natural world",
  },
  {
    slug: "art",
    label: "Art",
    blurb: "Illustration, generative work, and galleries",
  },
  {
    slug: "creative-tools",
    label: "Creative Tools",
    blurb: "Playgrounds, editors, and maker software",
  },
  {
    slug: "productivity",
    label: "Productivity",
    blurb: "Ways to think, plan, and get things done",
  },
  {
    slug: "learning",
    label: "Learning",
    blurb: "Courses, references, and deep explainers",
  },
  {
    slug: "weird-internet",
    label: "Weird Internet",
    blurb: "Delightful oddities and internet gems",
  },
  {
    slug: "indie-web",
    label: "Indie Web",
    blurb: "Personal sites, blogs, and homemade corners",
  },
  {
    slug: "writing",
    label: "Writing",
    blurb: "Essays, fiction, and beautiful prose",
  },
  {
    slug: "games",
    label: "Games",
    blurb: "Playable experiments and game design",
  },
  {
    slug: "culture",
    label: "Culture",
    blurb: "History, music, film, and ideas",
  },
] as const;

export const INTEREST_TAG_SLUGS: readonly string[] = INTEREST_TAGS.map(
  (t) => t.slug,
);

const TAG_BY_SLUG = new Map(INTEREST_TAGS.map((t) => [t.slug, t]));

export function getTag(slug: string): TagDefinition | undefined {
  return TAG_BY_SLUG.get(slug);
}

export function isKnownTag(slug: string): boolean {
  return TAG_BY_SLUG.has(slug);
}

export function tagLabel(slug: string): string {
  return TAG_BY_SLUG.get(slug)?.label ?? slug;
}
