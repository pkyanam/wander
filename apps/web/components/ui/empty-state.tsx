export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line-strong bg-paper-raised/50 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-paper-sunken text-ink-faint">
        {icon}
      </span>
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-soft">
          {message}
        </p>
      </div>
      {action}
    </div>
  );
}
