import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth";
import { InterestPicker } from "@/components/onboarding/interest-picker";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/sign-in");
  if (profile.onboarded) redirect("/wander");

  return <InterestPicker initialInterests={profile.interests} />;
}
