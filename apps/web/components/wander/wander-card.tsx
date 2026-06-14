import type { DestinationCard } from "@wander/shared";
import { Tag } from "@/components/ui/chip";
import { FlagIcon } from "@/components/icons";
import { HeroImage } from "@/components/wander/hero-image";

export function WanderCard({
  card,
  onReport,
}: {
  card: DestinationCard;
  onReport?: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-card border border-line bg-paper-raised shadow-card">
      <HeroImage domain={card.domain} imageUrl={card.imageUrl} />

      <div className="p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-[1.75rem]">
          {card.title}
        </h2>
        <p className="mt-2.5 text-[1.02rem] leading-relaxed text-ink-soft">
          {card.hook}
        </p>
        {card.summary && (
          <p className="mt-2 text-sm leading-relaxed text-ink-faint">
            {card.summary}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {card.tags.map((t) => (
            <Tag key={t.slug}>{t.label}</Tag>
          ))}
        </div>

        {onReport && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onReport}
              className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-love"
            >
              <FlagIcon size={14} />
              Report
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
