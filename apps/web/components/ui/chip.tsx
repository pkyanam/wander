import { cn } from "@/lib/utils";

/** Small, non-interactive tag label (used on cards and lists). */
export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Selectable interest chip used during onboarding. */
export function InterestChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-pill border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.97]",
        selected
          ? "border-accent bg-accent text-paper-raised shadow-[0_6px_16px_-8px_rgba(191,77,44,0.7)]"
          : "border-line-strong bg-paper-raised text-ink hover:border-accent/50 hover:bg-paper-sunken",
      )}
    >
      {label}
    </button>
  );
}
