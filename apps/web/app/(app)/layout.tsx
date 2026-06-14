import { AppShell } from "@/components/nav/app-shell";

export const dynamic = "force-dynamic";

// The app is fully usable without signing in. Personalization lives in the
// browser (localStorage); only /admin requires authentication.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
