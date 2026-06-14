import { getUserProfile } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getUserProfile();
  if (!profile) return unauthorized();
  return ok(profile);
}
