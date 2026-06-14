import { getOrCreateUser } from "@/lib/auth";
import { notFound, ok, parseBody, unauthorized } from "@/lib/api";
import {
  getDefaultCollectionId,
  getSavedItems,
  loadCard,
  recordInteraction,
} from "@/lib/db-helpers";
import { track } from "@/lib/analytics";
import { getDb, schema } from "@wander/db";
import { saveSchema } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { savedDestinations } = schema;

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  return ok({ items: await getSavedItems(user.id) });
}

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();

  const parsed = await parseBody(req, saveSchema);
  if (!parsed.ok) return parsed.response;

  const card = await loadCard(parsed.data.destinationId);
  if (!card) return notFound("Destination not found.");

  const db = getDb();
  const collectionId = await getDefaultCollectionId(user.id);
  await db
    .insert(savedDestinations)
    .values({
      userId: user.id,
      destinationId: parsed.data.destinationId,
      collectionId,
    })
    .onConflictDoNothing({
      target: [savedDestinations.userId, savedDestinations.destinationId],
    });

  await recordInteraction(user.id, parsed.data.destinationId, "saved");
  track("destination_saved", {
    userId: user.id,
    destinationId: parsed.data.destinationId,
  });

  return ok({ saved: true, card });
}
