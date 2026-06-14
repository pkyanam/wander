import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-pill " +
  "transition-[transform,background-color,box-shadow,color] duration-200 " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 " +
  "select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-paper-raised shadow-[0_6px_18px_-8px_rgba(191,77,44,0.7)] hover:bg-accent-strong",
  secondary:
    "bg-paper-raised text-ink border border-line-strong hover:bg-paper-sunken",
  ghost: "bg-transparent text-ink-soft hover:bg-paper-sunken hover:text-ink",
  dark: "bg-brand-dark text-paper hover:bg-brand-dark-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-7 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md") {
  return cn(base, variants[variant], sizes[size]);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses(variant, size), className)}
      {...props}
    />
  );
}
