"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand-mark";
import {
  BookmarkIcon,
  ClockIcon,
  CompassIcon,
  ShieldIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/wander", label: "Wander", Icon: CompassIcon },
  { href: "/saved", label: "Saved", Icon: BookmarkIcon },
  { href: "/history", label: "History", Icon: ClockIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="surface-blur sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/wander" aria-label="Wander home">
            <Wordmark size={28} />
          </Link>

          <div className="flex items-center gap-1">
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-pill px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive(href)
                      ? "bg-paper-sunken text-ink"
                      : "text-ink-soft hover:bg-paper-sunken/60 hover:text-ink",
                  )}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
            </nav>
            <Link
              href="/admin"
              aria-label="Admin"
              title="Admin"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-paper-sunken hover:text-ink"
            >
              <ShieldIcon size={18} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12">
        {children}
      </main>

      <nav className="surface-blur fixed inset-x-0 bottom-0 z-40 border-t border-line md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors",
                isActive(href)
                  ? "text-accent"
                  : "text-ink-faint hover:text-ink",
              )}
            >
              <Icon size={22} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
