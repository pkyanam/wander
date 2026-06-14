import { getOrCreateUser, isAdmin } from "@/lib/auth";
import { forbidden, ok, unauthorized } from "@/lib/api";
import { listCandidates } from "@/lib/curation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const url = new URL(req.url);
  const minQualityParam = url.searchParams.get("minQuality");
  const result = await listCandidates({
    status: url.searchParams.get("status"),
    q: url.searchParams.get("q"),
    sourceId: url.searchParams.get("sourceId"),
    minQuality: minQualityParam !== null ? Number(minQualityParam) : null,
    limit: Number(url.searchParams.get("limit") ?? 100) || 100,
  });
  return ok(result);
}
