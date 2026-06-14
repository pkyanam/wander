import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth";
import { AppShell } from "@/components/nav/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();
  if (!profile) redirect("/sign-in");
  if (!profile.onboarded) redirect("/onboarding");

  return <AppShell profile={profile}>{children}</AppShell>;
}
