import { getOrCreateUser, getUserProfile } from "@/lib/auth";
import { ok, parseBody, unauthorized } from "@/lib/api";
import { setUserInterests } from "@/lib/db-helpers";
import { track } from "@/lib/analytics";
import { updateInterestsSchema } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();

  const parsed = await parseBody(req, updateInterestsSchema);
  if (!parsed.ok) return parsed.response;

  const wasOnboarded = user.onboardedAt != null;
  await setUserInterests(user.id, parsed.data.interests);

  if (!wasOnboarded) {
    track("onboarding_completed", {
      userId: user.id,
      interestCount: parsed.data.interests.length,
    });
  }

  const profile = await getUserProfile();
  return ok(profile);
}
