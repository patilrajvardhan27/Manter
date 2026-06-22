import Link from "next/link";
import type { ReactNode } from "react";

/** Centered, mobile-first shell for auth + onboarding screens. */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="rise" style={{ animationDelay: "0ms" }}>
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-plum-deep"
        >
          Charms
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        {eyebrow ? (
          <p
            className="rise text-xs font-semibold uppercase tracking-wider text-plum"
            style={{ animationDelay: "60ms" }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className="rise mt-2 font-display text-[2rem] font-light leading-tight tracking-tight text-ink"
          style={{ animationDelay: "120ms" }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className="rise mt-2 text-[0.98rem] leading-relaxed text-ink-soft"
            style={{ animationDelay: "180ms" }}
          >
            {subtitle}
          </p>
        ) : null}

        <div className="rise mt-8" style={{ animationDelay: "240ms" }}>
          {children}
        </div>
      </div>

      {footer ? (
        <footer className="rise text-center text-sm text-ink-soft" style={{ animationDelay: "300ms" }}>
          {footer}
        </footer>
      ) : null}
    </main>
  );
}
