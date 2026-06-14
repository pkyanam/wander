import { getOrCreateUser, isAdmin } from "@/lib/auth";
import { forbidden, notFound, ok, parseBody, unauthorized } from "@/lib/api";
import { approveCandidate, getCandidate } from "@/lib/curation";
import { getDb, schema } from "@wander/db";
import { approveCandidateSchema } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { catalogImports } = schema;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const { id } = await ctx.params;
  const parsed = await parseBody(req, approveCandidateSchema);
  if (!parsed.ok) return parsed.response;

  const result = await approveCandidate(id, parsed.data.overrides);
  if (!result) return notFound("Candidate not found.");

  // Audit the import through the same trail seeds/imports use.
  const db = getDb();
  await db.insert(catalogImports).values({
    source: "curation_approve",
    label: `curation approve @ ${new Date().toISOString()}`,
    total: 1,
    created: result.created ? 1 : 0,
    updated: result.created ? 0 : 1,
    importedByUserId: user.id,
  });

  const candidate = await getCandidate(id);
  return ok({ destinationId: result.destinationId, candidate });
}
