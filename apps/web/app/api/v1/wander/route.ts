import { ok } from "@/lib/api";
import { loadCard } from "@/lib/db-helpers";
import { recommendNext } from "@/lib/recommendation";
import { track } from "@/lib/analytics";
import { wanderRequestSchema } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Wander is anonymous. Personalization (interests + the already-seen set)
  // lives in the browser and is passed in with each request.
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = wanderRequestSchema.safeParse(body);
  const exclude = parsed.success ? (parsed.data.exclude ?? []) : [];
  const interests = parsed.success ? (parsed.data.interests ?? []) : [];

  track("wander_requested");

  const [id] = await recommendNext({ interests, exclude, limit: 1 });
  if (!id) return ok({ card: null, exhausted: true });

  const card = await loadCard(id);
  if (!card) return ok({ card: null, exhausted: true });

  track("destination_viewed", { destinationId: id });

  return ok({ card, exhausted: false });
}
