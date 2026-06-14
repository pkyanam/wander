import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb, schema, type UserRow } from "@wander/db";
import type { UserProfile, UserRole } from "@wander/shared";
import { eq } from "drizzle-orm";

const { users, collections, userInterests, tags } = schema;

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
  if (found[0]) return found[0];

  const cu = await currentUser();
  const email =
    cu?.primaryEmailAddress?.emailAddress ??
    cu?.emailAddresses?.[0]?.emailAddress ??
    null;
  const displayName =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") ||
    cu?.username ||
    null;
  const role: UserRole =
    (cu?.publicMetadata as { role?: string } | undefined)?.role === "admin"
      ? "admin"
      : "user";

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
