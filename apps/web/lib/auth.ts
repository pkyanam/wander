import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb, schema, type UserRow } from "@wander/db";
import type { UserProfile, UserRole } from "@wander/shared";
import { eq } from "drizzle-orm";

const { users, collections, userInterests, tags } = schema;

/** Comma-separated allowlist of emails that should always be admins. */
function adminEmailAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Decide a user's role on (re)sign-in. An account is admin when any of:
 *  - Clerk `publicMetadata.role === "admin"` (manual grant in the dashboard),
 *  - its email is in the `ADMIN_EMAILS` allowlist,
 *  - it is already an admin (never silently demote), or
 *  - bootstrap: no allowlist is set and no admin exists yet, so the very first
 *    user to sign in becomes the admin (zero-config local/self-host).
 */
async function resolveRole(opts: {
  email: string | null;
  metaRole: string | undefined;
  existing: UserRow | null;
}): Promise<UserRole> {
  if (opts.metaRole === "admin") return "admin";
  const allowlist = adminEmailAllowlist();
  if (opts.email && allowlist.includes(opts.email.toLowerCase())) return "admin";
  if (opts.existing?.role === "admin") return "admin";

  if (allowlist.length === 0) {
    const db = getDb();
    const anyAdmin = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    if (!anyAdmin[0]) return "admin";
  }
  return "user";
}

/**
 * Resolve the internal user row for the current Clerk session, creating it
 * (and a default "Saved" collection) on first sight. Returns null when signed
 * out. This is the single bridge between Clerk identity and our database.
 */
export async function getOrCreateUser(): Promise<UserRow | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const db = getDb();
  const found = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  const existing = found[0] ?? null;

  const cu = await currentUser();
  const email =
    cu?.primaryEmailAddress?.emailAddress ??
    cu?.emailAddresses?.[0]?.emailAddress ??
    existing?.email ??
    null;
  const displayName =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") ||
    cu?.username ||
    existing?.displayName ||
    null;
  const role = await resolveRole({
    email,
    metaRole: (cu?.publicMetadata as { role?: string } | undefined)?.role,
    existing,
  });

  const inserted = await db
    .insert(users)
    .values({
      clerkId,
      email,
      displayName,
      imageUrl: cu?.imageUrl ?? null,
      role,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email,
        displayName,
        imageUrl: cu?.imageUrl ?? null,
        role,
        updatedAt: new Date(),
      },
    })
    .returning();

  const user = inserted[0]!;
  await db
    .insert(collections)
    .values({ userId: user.id, name: "Saved", isDefault: true })
    .onConflictDoNothing();
  return user;
}

/** The current user as the API/UI DTO, including interests + onboarded flag. */
export async function getUserProfile(): Promise<UserProfile | null> {
  const user = await getOrCreateUser();
  if (!user) return null;

  const db = getDb();
  const interestRows = await db
    .select({ slug: tags.slug })
    .from(userInterests)
    .innerJoin(tags, eq(tags.id, userInterests.tagId))
    .where(eq(userInterests.userId, user.id));

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    imageUrl: user.imageUrl,
    role: user.role,
    onboarded: user.onboardedAt != null,
    interests: interestRows.map((r) => r.slug),
  };
}

export function isAdmin(user: Pick<UserRow, "role"> | null): boolean {
  return user?.role === "admin";
}
