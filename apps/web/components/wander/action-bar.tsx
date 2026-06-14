import { Button } from "@/components/ui/button";
import {
  BookmarkIcon,
  ExternalIcon,
  HeartIcon,
  SkipIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

function Reaction({
  label,
  onClick,
  disabled,
  size = "md",
  tone = "neutral",
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: "md" | "lg";
  tone?: "neutral" | "love";
  active?: boolean;
  children: React.ReactNode;
}) {
  const dim = size === "lg" ? "h-16 w-16" : "h-13 w-13";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          "flex items-center justify-center rounded-full border transition-all duration-200",
          "active:scale-90 disabled:pointer-events-none disabled:opacity-40",
          dim,
          tone === "love"
            ? "border-love/30 bg-love-soft/50 text-love hover:bg-love hover:text-paper-raised hover:shadow-[0_8px_22px_-8px_rgba(197,48,74,0.7)]"
            : active
              ? "border-accent bg-accent text-paper-raised"
              : "border-line-strong bg-paper-raised text-ink-soft hover:border-ink-faint hover:text-ink",
        )}
      >
        {children}
      </button>
      <span className="text-xs font-medium text-ink-faint">{label}</span>
    </div>
  );
}

export function ActionBar({
  saved,
  acting,
  onSkip,
  onLove,
  onSave,
  onVisit,
}: {
  saved: boolean;
  acting: boolean;
  onSkip: () => void;
  onLove: () => void;
  onSave: () => void;
  onVisit: () => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-end justify-center gap-7 sm:gap-9">
        <Reaction label="Skip" onClick={onSkip} disabled={acting}>
          <SkipIcon size={22} />
        </Reaction>
        <Reaction
          label="Love"
          tone="love"
          size="lg"
          onClick={onLove}
          disabled={acting}
        >
          <HeartIcon size={26} />
        </Reaction>
        <Reaction
          label={saved ? "Saved" : "Save"}
          active={saved}
          onClick={onSave}
        >
          <BookmarkIcon size={22} filled={saved} />
        </Reaction>
      </div>

      <Button
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        onClick={onVisit}
      >
        <ExternalIcon size={19} />
        Visit site
      </Button>
    </div>
  );
}
