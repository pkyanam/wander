import Link from "next/link";
import type { DestinationCard } from "@wander/shared";
import { Tag } from "@/components/ui/chip";
import { faviconUrl, pickHero } from "@/lib/utils";

export function DestinationRow({
  card,
  href,
  meta,
  action,
}: {
  card: DestinationCard;
  href: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const hero = pickHero(card.domain);
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-paper-raised p-3 shadow-[0_1px_2px_rgba(36,29,21,0.04)] transition-colors hover:border-line-strong sm:gap-4 sm:p-4">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4"
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm sm:h-14 sm:w-14"
          style={{
            backgroundImage: `linear-gradient(135deg, ${hero.from}, ${hero.to})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faviconUrl(card.domain, 64)}
            alt=""
            width={26}
            height={26}
            className="h-6 w-6 rounded"
            loading="lazy"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-xs text-ink-faint">
            <span className="truncate">{card.domain}</span>
            {meta}
          </span>
          <span className="mt-0.5 block truncate font-display text-lg font-semibold text-ink">
            {card.title}
          </span>
          <span className="mt-0.5 line-clamp-1 block text-sm text-ink-soft">
            {card.hook}
          </span>
          <span className="mt-1.5 hidden flex-wrap gap-1.5 sm:flex">
            {card.tags.slice(0, 3).map((t) => (
              <Tag key={t.slug}>{t.label}</Tag>
            ))}
          </span>
        </span>
      </Link>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
