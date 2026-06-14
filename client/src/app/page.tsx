import Link from "next/link";
import { Award, ShieldAlert, MapPinned, ArrowRight, type LucideIcon } from "lucide-react";
import { QUALITIES, QUALITY_GROUPS } from "@/lib/constants/qualities";

const FEATURES: { tag: string; title: string; body: string; color: string; Icon: LucideIcon }[] = [
  {
    tag: "Character score",
    title: "23 qualities, not 23 photos",
    body: "She weights what matters to her. He's scored on it — by a behavioral quiz and by women who've actually dated him.",
    color: "var(--color-plum)",
    Icon: Award,
  },
  {
    tag: "AI red-flag scan",
    title: "Catches the patterns you'd miss",
    body: "Claude reads for controlling language, guilt-trips, and love-bombing — and explains why each one matters.",
    color: "var(--color-redflag)",
    Icon: ShieldAlert,
  },
  {
    tag: "Date check-in",
    title: "Someone always knows you're safe",
    body: "Set a timer before a date. Don't confirm you're okay, and your emergency contact is alerted with your last location.",
    color: "var(--color-sage)",
    Icon: MapPinned,
  },
];

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-12 pt-[max(2rem,env(safe-area-inset-top))]">
      {/* nav */}
      <header className="flex items-center justify-between rise" style={{ animationDelay: "0ms" }}>
        <span className="font-display text-2xl font-semibold tracking-tight text-plum-deep">
          Manter
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-plum"
        >
          Sign in
        </Link>
      </header>

      {/* hero */}
      <section className="mt-14">
        <p
          className="rise inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1 text-xs font-medium text-plum"
          style={{ animationDelay: "60ms" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sage" />
          Built for women with standards
        </p>

        <h1
          className="rise mt-5 font-display text-[2.85rem] font-light leading-[1.05] tracking-tight text-ink"
          style={{ animationDelay: "120ms" }}
        >
          Date by{" "}
          <em className="font-medium not-italic text-plum">character</em>,
          <br />
          not by photos.
        </h1>

        <p
          className="rise mt-5 text-[1.05rem] leading-relaxed text-ink-soft"
          style={{ animationDelay: "200ms" }}
        >
          Manter turns “is he actually a good man?” from a gut feeling into a
          verified score — across 23 qualities, with AI red-flag detection and
          real safety built in.
        </p>

        <div className="rise mt-8 flex flex-col gap-3" style={{ animationDelay: "280ms" }}>
          <Link
            href="/register"
            className="group flex h-14 items-center justify-center gap-2 rounded-2xl bg-plum text-base font-semibold text-cream shadow-[var(--shadow-soft)] transition hover:bg-plum-deep active:scale-[0.98]"
          >
            Create your account
            <ArrowRight size={18} strokeWidth={2.4} className="transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="#how"
            className="flex h-14 items-center justify-center rounded-2xl border border-plum/20 text-base font-medium text-plum-deep transition active:scale-[0.98]"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* features */}
      <section id="how" className="mt-20 space-y-4">
        {FEATURES.map((f, i) => (
          <article
            key={f.tag}
            className="rise rounded-[var(--radius-card)] bg-paper/70 p-6 shadow-[var(--shadow-soft)]"
            style={{ animationDelay: `${340 + i * 80}ms` }}
          >
            <span
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: f.color }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in srgb, ${f.color} 12%, transparent)` }}
              >
                <f.Icon size={17} strokeWidth={2} />
              </span>
              {f.tag}
            </span>
            <h3 className="mt-3 font-display text-xl font-medium text-ink">
              {f.title}
            </h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
              {f.body}
            </p>
          </article>
        ))}
      </section>

      {/* the 23 qualities, as a quiet tag cloud */}
      <section className="mt-20">
        <h2 className="font-display text-2xl font-light text-ink">
          The 23 qualities she's actually looking for
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Drawn from real lists women wrote, mapped to relationship psychology.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {QUALITIES.map((q) => (
            <span
              key={q.key}
              className="rounded-full border px-3 py-1.5 text-[0.8rem] font-medium"
              style={{
                borderColor: `color-mix(in srgb, ${QUALITY_GROUPS[q.group].color} 30%, transparent)`,
                color: QUALITY_GROUPS[q.group].color,
              }}
            >
              {q.label}
            </span>
          ))}
        </div>
      </section>

      <footer className="mt-20 border-t border-ink/10 pt-6 text-xs text-ink-soft">
        <p>Manter — pro good men, anti bad ones. Your data stays yours.</p>
        <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          <Link href="/about" className="underline-offset-4 hover:text-plum hover:underline">
            About
          </Link>
          <Link href="/safety" className="underline-offset-4 hover:text-plum hover:underline">
            Safety Center
          </Link>
          <Link href="/privacy" className="underline-offset-4 hover:text-plum hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:text-plum hover:underline">
            Terms of Service
          </Link>
        </nav>
      </footer>
    </main>
  );
}
