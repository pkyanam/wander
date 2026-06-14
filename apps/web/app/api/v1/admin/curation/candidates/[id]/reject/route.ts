import { getOrCreateUser, isAdmin } from "@/lib/auth";
import { forbidden, notFound, ok, parseBody, unauthorized } from "@/lib/api";
import { rejectCandidate } from "@/lib/curation";
import { rejectCandidateSchema } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const { id } = await ctx.params;
  const parsed = await parseBody(req, rejectCandidateSchema);
  if (!parsed.ok) return parsed.response;

  const candidate = await rejectCandidate(id, parsed.data.reason);
  if (!candidate) return notFound("Candidate not found.");
  return ok({ candidate });
}
