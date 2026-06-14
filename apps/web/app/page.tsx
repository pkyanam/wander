import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { buttonClasses } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { INTEREST_TAGS } from "@wander/shared";

export const dynamic = "force-dynamic";

const HIGHLIGHTS = INTEREST_TAGS.slice(0, 7);

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/wander");

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <BrandMark size={76} className="mb-8 drop-shadow-sm" />

      <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-ink-faint">
        Serendipitous web discovery
      </p>

      <h1 className="font-display text-[clamp(2.75rem,9vw,4.75rem)] font-semibold leading-[0.98] tracking-tight text-ink">
        Wander into
        <br />
        <span className="text-accent italic">wonder</span>.
      </h1>

      <p className="mx-auto mt-6 max-w-md text-pretty text-lg leading-relaxed text-ink-soft">
        One tap. One beautiful destination at a time. A calm, curated way to
        rediscover the most delightful corners of the web.
      </p>

      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/sign-up" className={buttonClasses("primary", "lg")}>
          Start wandering
        </Link>
        <Link href="/sign-in" className={buttonClasses("ghost", "lg")}>
          I already have an account
        </Link>
      </div>

      <div className="mt-14 flex max-w-lg flex-wrap items-center justify-center gap-2">
        {HIGHLIGHTS.map((t) => (
          <Tag key={t.slug}>{t.label}</Tag>
        ))}
        <span className="text-xs text-ink-faint">& more</span>
      </div>
    </main>
  );
}
