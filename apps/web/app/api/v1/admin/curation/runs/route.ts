import { getOrCreateUser, isAdmin } from "@/lib/auth";
import { forbidden, ok, parseBody, unauthorized } from "@/lib/api";
import { createRun } from "@/lib/curation";
import { startCurationRunSchema } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const parsed = await parseBody(req, startCurationRunSchema);
  if (!parsed.ok) return parsed.response;

  const run = await createRun(user.id, parsed.data);
  return ok({ run }, 201);
}
