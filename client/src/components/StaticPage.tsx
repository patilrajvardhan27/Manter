import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function StaticPage({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-2 pb-2">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper"
          aria-label="Back to home"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </Link>
        <span className="font-display text-lg font-semibold tracking-tight text-plum-deep">
          Manter
        </span>
      </header>

      <section className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-plum">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-[2rem] font-light leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
            {subtitle}
          </p>
        ) : null}
      </section>

      <article className="prose-static mt-8 space-y-6 text-[0.95rem] leading-relaxed text-ink-soft">
        {children}
      </article>
    </main>
  );
}

export function StaticSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-medium text-ink">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
