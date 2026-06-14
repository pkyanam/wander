import { getOrCreateUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api";
import { getHistoryItems } from "@/lib/db-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  return ok({ items: await getHistoryItems(user.id) });
}
