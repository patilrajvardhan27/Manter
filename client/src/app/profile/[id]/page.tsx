import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, ImageIcon, SlidersHorizontal, MessageSquareQuote, BarChart3 } from "lucide-react";
import { getMyProfile } from "@/lib/profile";
import { getProfileView } from "@/lib/match";
import { getMyWeights, getMyAnswers, getMyScores } from "@/lib/quiz-data";
import { QUALITY_BY_KEY, QUALITY_GROUPS, type QualityGroup } from "@/lib/constants/qualities";
import { VerifyBadge } from "@/components/VerifyBadge";
import { ProfileDetails } from "@/components/ProfileDetails";
import { QualityScoreBreakdown } from "@/components/QualityScores";

export default async function ProfileViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await getMyProfile();
  if (!userId) redirect("/login");
  if (id === userId) redirect("/home"); // your own profile lives at /home

  const person = await getProfileView(id);
  if (!person) notFound();

  // Every profile has the same three things, regardless of gender: a
  // character score + quiz answers, and priority weights for what they want.
  const [weights, answers, scores] = await Promise.all([
    getMyWeights(id),
    getMyAnswers(id),
    getMyScores(id),
  ]);
  const avgScore = scores.length ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : null;

  const groups = new Map<QualityGroup, typeof weights>();
  for (const w of weights) {
    const g = QUALITY_BY_KEY[w.key]?.group;
    if (!g) continue;
    const bucket = groups.get(g) ?? [];
    bucket.push(w);
    groups.set(g, bucket);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-2 pb-4">
        <Link
          href="/chats"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper"
          aria-label="Back"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </Link>
        <span className="text-sm font-medium text-ink-soft">Profile</span>
      </header>

      {person.photos.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {person.photos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`${person.display_name} photo ${i + 1}`}
              className="h-72 w-56 shrink-0 rounded-[var(--radius-card)] object-cover shadow-[var(--shadow-soft)]"
            />
          ))}
        </div>
      ) : (
        <div className="flex h-56 items-center justify-center rounded-[var(--radius-card)] bg-paper/60 text-ink-soft/40">
          <ImageIcon size={28} />
        </div>
      )}

      <section className="mt-5 rounded-[var(--radius-card)] bg-paper/70 p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-[2rem] font-light leading-tight tracking-tight text-ink">
          {person.display_name}
          {person.age ? <span className="text-ink-soft">, {person.age}</span> : null}
        </h1>
        {person.city ? (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
            <MapPin size={14} strokeWidth={2} />
            {person.city}
          </p>
        ) : null}
        <VerifyBadge status={person.verification} className="mt-2" />

        {person.bio ? (
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">{person.bio}</p>
        ) : null}
      </section>

      <div className="mt-4">
        <ProfileDetails details={person} />
      </div>

      {/* Character score */}
      {scores.length ? (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-plum">
              <BarChart3 size={14} strokeWidth={2.4} />
              Character score
            </h2>
            <p className="font-display text-2xl font-light leading-none text-plum-deep">
              {avgScore!.toFixed(1)}
              <span className="text-sm text-ink-soft">/5</span>
            </p>
          </div>
          <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-soft">
            Their self-assessment across the 23 qualities, scored from their quiz answers.
          </p>
          <div className="mt-4">
            <QualityScoreBreakdown scores={scores} />
          </div>
        </section>
      ) : null}

      {/* Priorities */}
      {weights.length ? (
        <section className="mt-4 rounded-[var(--radius-card)] bg-paper/70 p-6 shadow-[var(--shadow-soft)]">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-plum">
            <SlidersHorizontal size={14} strokeWidth={2.4} />
            What they're looking for
          </h2>
          <div className="mt-4 space-y-5">
            {[...groups.entries()].map(([group, items]) => {
              const color = QUALITY_GROUPS[group].color;
              return (
                <div key={group}>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color }}>
                    {QUALITY_GROUPS[group].label}
                  </p>
                  <ul className="mt-2 space-y-2.5">
                    {items.map((w) => (
                      <li key={w.key} className="flex items-center gap-3">
                        <span className="w-36 shrink-0 text-[0.85rem] leading-tight text-ink">
                          {w.label}
                        </span>
                        <span className="flex flex-1 items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span
                              key={n}
                              className="h-2 flex-1 rounded-full"
                              style={{
                                backgroundColor:
                                  n <= w.weight ? color : "color-mix(in srgb, var(--color-ink) 10%, transparent)",
                              }}
                            />
                          ))}
                        </span>
                        <span className="w-4 shrink-0 text-right text-[0.8rem] font-medium tabular-nums text-ink-soft">
                          {w.weight}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Quiz answers */}
      {answers.length ? (
        <section className="mt-4 rounded-[var(--radius-card)] bg-paper/70 p-6 shadow-[var(--shadow-soft)]">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-plum">
            <MessageSquareQuote size={14} strokeWidth={2.4} />
            Their answers
          </h2>
          <ul className="mt-4 space-y-3">
            {answers.map((a, i) => (
              <li key={a.questionId} className="rounded-2xl bg-paper/60 p-3.5 shadow-[var(--shadow-soft)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-plum">
                  Question {i + 1}
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-ink">{a.prompt}</p>
                <p className="mt-2 border-l-2 border-plum/25 pl-2.5 text-[0.88rem] leading-relaxed text-ink-soft">
                  {a.answer}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
