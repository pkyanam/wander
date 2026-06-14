import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getOrCreateUser, isAdmin } from "@/lib/auth";
import { Wordmark } from "@/components/brand-mark";
import { ArrowLeftIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOrCreateUser();
  if (!user) redirect("/sign-in");
  if (!isAdmin(user)) redirect("/wander");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="surface-blur sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/wander" aria-label="Back to app">
              <Wordmark size={26} />
            </Link>
            <span className="rounded-pill bg-brand-dark px-2.5 py-0.5 text-xs font-semibold text-paper">
              Catalog
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/wander"
              className="hidden items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:flex"
            >
              <ArrowLeftIcon size={16} />
              Back to app
            </Link>
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-7 sm:px-6">
        {children}
      </main>
    </div>
  );
}
