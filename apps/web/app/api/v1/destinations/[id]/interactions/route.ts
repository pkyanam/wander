import { getOrCreateUser } from "@/lib/auth";
import { notFound, ok, parseBody, unauthorized } from "@/lib/api";
import { loadCard, recordInteraction } from "@/lib/db-helpers";
import { track } from "@/lib/analytics";
import { interactionSchema, type AnalyticsEvent } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_BY_TYPE: Partial<Record<string, AnalyticsEvent>> = {
  loved: "destination_loved",
  skipped: "destination_skipped",
  visited: "destination_visited",
  saved: "destination_saved",
  unsaved: "destination_unsaved",
  viewed: "destination_viewed",
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const parsed = await parseBody(req, interactionSchema);
  if (!parsed.ok) return parsed.response;

  // Confirm the destination exists so we return a clean 404 rather than an FK error.
  const card = await loadCard(id);
  if (!card) return notFound("Destination not found.");

  await recordInteraction(user.id, id, parsed.data.type, parsed.data.context);

  const event = EVENT_BY_TYPE[parsed.data.type];
  if (event) {
    track(event, { userId: user.id, destinationId: id });
  }

  return ok({ recorded: true });
}
