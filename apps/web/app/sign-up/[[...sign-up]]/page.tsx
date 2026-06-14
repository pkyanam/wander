import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Wordmark } from "@/components/brand-mark";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" aria-label="Wander home">
        <Wordmark />
      </Link>
      <SignUp />
    </main>
  );
}
