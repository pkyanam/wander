import { getOrCreateUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api";
import { recordInteraction } from "@/lib/db-helpers";
import { track } from "@/lib/analytics";
import { getDb, schema } from "@wander/db";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { savedDestinations } = schema;

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ destinationId: string }> },
) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();

  const { destinationId } = await ctx.params;
  const db = getDb();
  await db
    .delete(savedDestinations)
    .where(
      and(
        eq(savedDestinations.userId, user.id),
        eq(savedDestinations.destinationId, destinationId),
      ),
    );

  await recordInteraction(user.id, destinationId, "unsaved");
  track("destination_unsaved", { userId: user.id, destinationId });

  return ok({ removed: true });
}
