import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({
  size = 24,
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.25" />
      <path
        d="M15.5 8.5 13.4 13.4 8.5 15.5 10.6 10.6Z"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  );
}

export function HeartIcon({
  filled,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <Svg {...props}>
      <path
        d="M12 20s-7-4.4-9.2-9C1.4 7.7 3 5 5.8 5c1.9 0 3.2 1.1 4.2 2.4C11 6.1 12.3 5 14.2 5 17 5 18.6 7.7 21.2 11 19 15.6 12 20 12 20Z"
        fill={filled ? "currentColor" : "none"}
      />
    </Svg>
  );
}

export function BookmarkIcon({
  filled,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <Svg {...props}>
      <path
        d="M6 4.5h12a1 1 0 0 1 1 1V20l-7-4-7 4V5.5a1 1 0 0 1 1-1Z"
        fill={filled ? "currentColor" : "none"}
      />
    </Svg>
  );
}

export function SkipIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5v14" />
      <path d="m9 6 8 6-8 6V6Z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5" />
    </Svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5c.6 3.4 1.6 4.4 5 5-3.4.6-4.4 1.6-5 5-.6-3.4-1.6-4.4-5-5 3.4-.6 4.4-1.6 5-5Z" />
      <path d="M18.5 13.5c.3 1.6.8 2.1 2.5 2.4-1.7.3-2.2.8-2.5 2.4-.3-1.6-.8-2.1-2.5-2.4 1.7-.3 2.2-.8 2.5-2.4Z" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 5 8 12l7 7" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6 18 18M18 6 6 18" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 7h15M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m2 0-.6 11a1.5 1.5 0 0 1-1.5 1.4H9.1A1.5 1.5 0 0 1 7.6 18L7 7" />
    </Svg>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 21V4m0 1.5h11l-2 3.5 2 3.5H5" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 19 6v5.5c0 4.3-2.9 7.4-7 8.9-4.1-1.5-7-4.6-7-8.9V6Z" />
    </Svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6.5 9.5V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9.5" />
    </Svg>
  );
}
