import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border border-ink bg-sun text-ink shadow-[var(--shadow-soft)] hover:bg-sun-deep disabled:opacity-50",
  outline: "border border-brand/20 text-brand-deep disabled:opacity-50",
  ghost: "text-brand-deep disabled:opacity-40",
};

const base =
  "flex h-14 w-full items-center justify-center rounded-full text-base font-semibold transition active:scale-[0.98] disabled:active:scale-100 disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: { variant?: Variant } & ComponentProps<"button">) {
  return (
    <button className={`${base} ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  href,
  children,
}: {
  variant?: Variant;
  className?: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
