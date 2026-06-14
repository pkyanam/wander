import { getOrCreateUser, isAdmin } from "@/lib/auth";
import { forbidden, ok, parseBody, unauthorized } from "@/lib/api";
import { bulkApprove } from "@/lib/curation";
import { bulkApproveCandidatesSchema } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const parsed = await parseBody(req, bulkApproveCandidatesSchema);
  if (!parsed.ok) return parsed.response;

  const result = await bulkApprove(user.id, parsed.data.ids);
  return ok(result);
}
