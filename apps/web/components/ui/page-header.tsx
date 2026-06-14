export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-ink-soft">{subtitle}</p>}
    </div>
  );
}
