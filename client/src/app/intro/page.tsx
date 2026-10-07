import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { getLearnedPreferences, getMyIntros, hasVoiceProfile } from "@/lib/intros";
import { IntroCard, PastIntro } from "@/components/IntroCard";
import { TabBar } from "@/components/TabBar";

/**
 * One introduction at a time, Known-style. The matchmaker job picks pairs in
 * rounds; both people have 24 hours to answer, and the chat only opens when
 * both say they're interested.
 */
export default async function IntroPage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/gender");

  const [{ current, past }, learned, interviewed] = await Promise.all([
    getMyIntros(),
    getLearnedPreferences(userId),
    hasVoiceProfile(userId),
  ]);
  const now = Date.now();
  const hoursLeft = current
    ? Math.max(1, Math.ceil((new Date(current.expiresAt).getTime() - now) / 3_600_000))
    : 0;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-28 pt-[max(2rem,env(safe-area-inset-top))]">
      <header>
        <h1 className="font-display text-[2rem] font-light leading-tight tracking-tight text-ink">
          {current ? `Meet ${current.other.display_name}` : `Nothing new yet, ${profile.display_name}`}
        </h1>
        {!current ? (
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
            Your matchmaker introduces one person at a time, and only when the fit works both ways. New introductions go
            out each round.
          </p>
        ) : null}
      </header>

      <div className="mt-6 space-y-8">
        {current ? <IntroCard intro={current} hoursLeft={hoursLeft} /> : null}

        {!interviewed ? (
          <section className="rounded-lg border border-ink/10 p-4">
            <p className="text-[0.95rem] leading-relaxed text-ink">
              A five-minute talk with your matchmaker covers the qualities the quiz can&apos;t, which makes your
              introductions sharper.
            </p>
            <Link
              href="/onboarding/voice?from=home"
              className="mt-3 inline-block text-sm font-medium text-brand underline underline-offset-4"
            >
              Talk to your matchmaker
            </Link>
          </section>
        ) : null}

        {learned.length ? (
          <section>
            <h2 className="font-display text-lg text-ink">What your matchmaker has noticed</h2>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
              From your answers so far, you lean{" "}
              {learned
                .map((l) => `${l.delta > 0 ? "toward" : "away from"} people strong in ${l.label.toLowerCase()}`)
                .join("; ")}
              , beyond what you told us. That nudges future introductions. Your own priorities still lead.
            </p>
          </section>
        ) : null}

        {past.length ? (
          <section>
            <h2 className="font-display text-lg text-ink">Earlier introductions</h2>
            <ul className="mt-2">
              {past.map((i) => (
                <PastIntro key={i.id} intro={i} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <TabBar />
    </main>
  );
}
