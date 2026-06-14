import { getOrCreateUser, isAdmin } from "@/lib/auth";
import { forbidden, notFound, ok, unauthorized } from "@/lib/api";
import { getRun } from "@/lib/curation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const { id } = await ctx.params;
  const run = await getRun(id);
  if (!run) return notFound("Run not found.");
  return ok({ run });
}
