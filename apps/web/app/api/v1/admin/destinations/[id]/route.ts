import { getOrCreateUser, isAdmin } from "@/lib/auth";
import { forbidden, notFound, ok, parseBody, unauthorized } from "@/lib/api";
import { loadAdmin, setDestinationTags } from "@/lib/db-helpers";
import { getDomain } from "@/lib/utils";
import { getDb, schema } from "@wander/db";
import { destinationUpdateSchema } from "@wander/shared";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { destinations } = schema;

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const { id } = await ctx.params;
  const parsed = await parseBody(req, destinationUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.url !== undefined) {
    set.url = data.url;
    set.domain = getDomain(data.url);
  }
  if (data.title !== undefined) set.title = data.title;
  if (data.hook !== undefined) set.hook = data.hook;
  if (data.summary !== undefined) set.summary = data.summary ?? null;
  if (data.imageUrl !== undefined) set.imageUrl = data.imageUrl ?? null;
  if (data.sourceType !== undefined) set.sourceType = data.sourceType;
  if (data.status !== undefined) set.status = data.status;
  if (data.qualityScore !== undefined) set.qualityScore = data.qualityScore;
  if (data.contentFlags !== undefined) set.contentFlags = data.contentFlags;

  const db = getDb();
  const existing = await loadAdmin(id);
  if (!existing) return notFound("Destination not found.");

  await db.update(destinations).set(set).where(eq(destinations.id, id));
  if (data.tags !== undefined) {
    await setDestinationTags(id, data.tags);
  }

  const item = await loadAdmin(id);
  return ok({ item });
}
