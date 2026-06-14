import { getOrCreateUser, isAdmin } from "@/lib/auth";
import { forbidden, ok, parseBody, unauthorized } from "@/lib/api";
import {
  listDestinationsAdmin,
  loadAdmin,
  upsertDestinationWithTags,
} from "@/lib/db-helpers";
import { destinationInputSchema } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const url = new URL(req.url);
  const result = await listDestinationsAdmin({
    status: url.searchParams.get("status"),
    q: url.searchParams.get("q"),
    limit: Number(url.searchParams.get("limit") ?? 100) || 100,
  });
  return ok(result);
}

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const parsed = await parseBody(req, destinationInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id, created } = await upsertDestinationWithTags(parsed.data);
  const item = await loadAdmin(id);
  return ok({ item, created }, created ? 201 : 200);
}
