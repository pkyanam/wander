import { getOrCreateUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api";
import { loadCard, recordInteraction } from "@/lib/db-helpers";
import { recommendNext } from "@/lib/recommendation";
import { track } from "@/lib/analytics";
import { wanderRequestSchema } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();

  // Lenient body: an empty POST is valid and means "just give me a card".
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = wanderRequestSchema.safeParse(body);
  const exclude = parsed.success ? (parsed.data.exclude ?? []) : [];

  track("wander_requested", { userId: user.id });

  const [id] = await recommendNext({ userId: user.id, exclude, limit: 1 });
  if (!id) return ok({ card: null, exhausted: true });

  const card = await loadCard(id);
  if (!card) return ok({ card: null, exhausted: true });

  // Showing the card counts as a view; this also excludes it from future picks.
  await recordInteraction(user.id, id, "viewed");
  track("destination_viewed", { userId: user.id, destinationId: id });

  return ok({ card, exhausted: false });
}
