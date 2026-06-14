"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { INTEREST_TAGS } from "@wander/shared";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { InterestChip } from "@/components/ui/chip";
import { SparklesIcon } from "@/components/icons";
import { getInterests, setInterests } from "@/lib/local-store";

export function InterestPicker() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Hydrate from any previously chosen interests in localStorage.
  useEffect(() => {
    setSelected(new Set(getInterests()));
  }, []);

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function finish(interests: string[]) {
    setSubmitting(true);
    setInterests(interests);
    router.push("/wander");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <BrandMark size={52} className="mb-7" />
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
          What are you curious about?
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Pick a few to shape your discoveries. We&rsquo;ll still surprise you —
          and you can change these anytime.
        </p>
      </motion.div>

      <div className="mt-9 flex flex-wrap gap-2.5">
        {INTEREST_TAGS.map((tag, i) => (
          <motion.div
            key={tag.slug}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.12 + i * 0.025,
              duration: 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <InterestChip
              label={tag.label}
              selected={selected.has(tag.slug)}
              onClick={() => toggle(tag.slug)}
            />
          </motion.div>
        ))}
      </div>

      <div className="mt-10 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          disabled={submitting}
          onClick={() => finish([])}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          <SparklesIcon size={16} />
          Surprise me
        </button>

        <Button
          size="lg"
          disabled={submitting}
          onClick={() => finish([...selected])}
          className="w-full sm:w-auto"
        >
          {submitting
            ? "Setting up\u2026"
            : selected.size > 0
              ? `Start wandering (${selected.size})`
              : "Start wandering"}
        </Button>
      </div>
    </main>
  );
}
