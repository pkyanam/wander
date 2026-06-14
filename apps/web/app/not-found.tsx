import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <BrandMark size={56} />
      <h1 className="font-display text-3xl font-semibold text-ink">
        Lost the trail
      </h1>
      <p className="text-ink-soft">
        This page wandered off somewhere. Let&rsquo;s get you back.
      </p>
      <Link href="/wander" className={buttonClasses("primary", "md")}>
        Back to wandering
      </Link>
    </main>
  );
}
