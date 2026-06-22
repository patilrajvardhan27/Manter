import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <main className="mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      {/* nav */}
      <header className="flex items-center justify-between rise" style={{ animationDelay: "0ms" }}>
        <span className="font-display text-xl font-semibold tracking-tight text-plum-deep">
          Charms
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-plum"
        >
          Sign in
        </Link>
      </header>

      {/* hero */}
      <section className="flex flex-1 flex-col justify-center">
        <h1
          className="rise font-display text-[2.1rem] font-light leading-[1.1] tracking-tight text-ink"
          style={{ animationDelay: "60ms" }}
        >
          Date by{" "}
          <em className="font-medium not-italic text-plum">character</em>,
          <br />
          not by photos.
        </h1>

        <p
          className="rise mt-3 text-[0.95rem] leading-relaxed text-ink-soft"
          style={{ animationDelay: "120ms" }}
        >
          Charms turns “is he actually a good man?” from a gut feeling into a
          verified score — across 23 qualities, with AI red-flag detection and
          real safety built in.
        </p>

        <div className="rise mt-5" style={{ animationDelay: "180ms" }}>
          <Link
            href="/register"
            className="group flex h-12 items-center justify-center gap-2 rounded-2xl bg-plum text-base font-semibold text-cream shadow-[var(--shadow-soft)] transition hover:bg-plum-deep active:scale-[0.98]"
          >
            Create your account
            <ArrowRight size={18} strokeWidth={2.4} className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <footer className="mt-4 border-t border-ink/10 pt-3 text-[0.7rem] text-ink-soft">
        <p>Charms — pro good men, anti bad ones. Your data stays yours.</p>
        <nav className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
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
