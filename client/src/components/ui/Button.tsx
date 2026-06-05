import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-plum text-cream shadow-[var(--shadow-soft)] disabled:opacity-50",
  outline: "border border-plum/20 text-plum-deep disabled:opacity-50",
  ghost: "text-plum-deep disabled:opacity-40",
};

const base =
  "flex h-14 w-full items-center justify-center rounded-2xl text-base font-semibold transition active:scale-[0.98] disabled:active:scale-100 disabled:cursor-not-allowed";

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
