import { cn } from "@/lib/utils";

/** The Wander compass app icon, rendered at an arbitrary size. */
export function BrandMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/wander-icon-192.png"
      alt=""
      width={size}
      height={size}
      className={cn("block select-none", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

/** Brand mark + "Wander" wordmark in the display serif. */
export function Wordmark({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="font-display text-[1.4rem] font-semibold tracking-tight text-ink">
        Wander
      </span>
    </span>
  );
}
