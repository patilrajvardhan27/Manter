"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, MessageCircle, IdCard, MessageSquareQuote, BarChart3, Pencil, ImagePlus } from "lucide-react";
import { VerifyBadge } from "@/components/VerifyBadge";
import { ProfileDetails } from "@/components/ProfileDetails";
import type { Profile } from "@/lib/profile";
import type { AnsweredQuestion, QualityScore } from "@/lib/quiz-data";
import { QUALITY_BY_KEY, QUALITY_GROUPS, type QualityGroup } from "@/lib/constants/qualities";

type Tab = "profile" | "answers" | "scores";

const TABS: { id: Tab; label: string; icon: typeof IdCard }[] = [
  { id: "profile", label: "Profile", icon: IdCard },
  { id: "answers", label: "Answers", icon: MessageSquareQuote },
  { id: "scores", label: "Scores", icon: BarChart3 },
];

export function ManProfile({
  profile,
  answers,
  scores,
  photos,
}: {
  profile: Profile;
  answers: AnsweredQuestion[];
  scores: QualityScore[];
  photos: string[];
}) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between rise" style={{ animationDelay: "0ms" }}>
        <span className="font-display text-2xl font-semibold tracking-tight text-plum-deep">
          Charms
        </span>
        <div className="flex items-center gap-1">
          <Link
            href="/profile/edit"
            aria-label="Edit profile"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper hover:text-plum"
          >
            <Pencil size={17} strokeWidth={2} />
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper hover:text-plum"
            >
              <LogOut size={18} strokeWidth={2} />
            </button>
          </form>
        </div>
      </header>

      {/* Hero */}
      <section className="mt-6 rise" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-plum/10 font-display text-2xl font-semibold text-plum">
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[1.7rem] font-light leading-tight tracking-tight text-ink">
              {profile.display_name}
            </h1>
            <p className="mt-0.5 truncate text-sm text-ink-soft">
              {[profile.age ? `${profile.age}` : null, profile.city].filter(Boolean).join(" · ") ||
                "Your profile"}
            </p>
            <VerifyBadge status={profile.verification} className="mt-1.5" />
          </div>
        </div>
      </section>

      {/* Segmented tabs */}
      <div
        className="mt-6 flex gap-1 rounded-full bg-paper/70 p-1 rise"
        style={{ animationDelay: "140ms" }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-colors ${
                active ? "bg-plum text-cream shadow-[var(--shadow-soft)]" : "text-ink-soft"
              }`}
            >
              <Icon size={15} strokeWidth={2.2} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div key={tab} className="mt-5 rise" style={{ animationDelay: "0ms" }}>
        {tab === "profile" && (
          <ProfilePanel profile={profile} answers={answers} scores={scores} photos={photos} />
        )}
        {tab === "answers" && <AnswersPanel answers={answers} />}
        {tab === "scores" && <ScoresPanel scores={scores} />}
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- Profile tab */

function ProfilePanel({
  profile,
  answers,
  scores,
  photos,
}: {
  profile: Profile;
  answers: AnsweredQuestion[];
  scores: QualityScore[];
  photos: string[];
}) {
  const avg = scores.length
    ? scores.reduce((s, q) => s + q.score, 0) / scores.length
    : null;

  return (
    <div className="space-y-4">
      <PhotoStrip photos={photos} />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Questions answered" value={String(answers.length)} />
        <Stat label="Avg quality score" value={avg ? avg.toFixed(1) : "—"} />
      </div>

      {profile.bio ? (
        <Card>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-plum">About</h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink">{profile.bio}</p>
        </Card>
      ) : null}

      <Card>
        <dl className="space-y-3 text-sm">
          <Row label="Name" value={profile.display_name} />
          {profile.age ? <Row label="Age" value={String(profile.age)} /> : null}
          {profile.city ? <Row label="City" value={profile.city} /> : null}
        </dl>
      </Card>

      <ProfileDetails details={profile} />

      <Link
        href="/chats"
        className="group flex items-center justify-between rounded-[var(--radius-card)] border border-plum/15 bg-paper/30 p-5 transition hover:border-plum/30 active:scale-[0.99]"
      >
        <span>
          <span className="block font-display text-base font-medium text-ink">
            Your conversations
          </span>
          <span className="mt-0.5 block text-[0.85rem] text-ink-soft">
            When a woman starts a chat, it lands here.
          </span>
        </span>
        <MessageCircle size={20} strokeWidth={2} className="shrink-0 text-plum" />
      </Link>
    </div>
  );
}

/* ---------------------------------------------------------------- Answers tab */

function AnswersPanel({ answers }: { answers: AnsweredQuestion[] }) {
  if (!answers.length) {
    return <Empty>You haven&apos;t answered any questions yet.</Empty>;
  }
  return (
    <div className="space-y-3">
      {answers.map((a, i) => (
        <Card key={a.questionId} hover>
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-plum">
            Question {i + 1}
          </p>
          <p className="mt-1.5 text-sm font-medium leading-snug text-ink">{a.prompt}</p>
          <p className="mt-2.5 border-l-2 border-plum/25 pl-3 text-[0.95rem] leading-relaxed text-ink-soft">
            {a.answer}
          </p>
        </Card>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- Scores tab */

function ScoresPanel({ scores }: { scores: QualityScore[] }) {
  if (!scores.length) {
    return <Empty>No quality scores yet — finish the quiz to see them.</Empty>;
  }

  // Group by the 5 quality groups for a scannable mobile layout.
  const groups = new Map<QualityGroup, QualityScore[]>();
  for (const s of scores) {
    const g = QUALITY_BY_KEY[s.key]?.group;
    if (!g) continue;
    const bucket = groups.get(g) ?? [];
    bucket.push(s);
    groups.set(g, bucket);
  }

  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([group, items]) => (
        <Card key={group} hover>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-plum">
            {QUALITY_GROUPS[group].label}
          </h2>
          <ul className="mt-3 space-y-3">
            {items.map((s, i) => (
              <li key={s.key}>
                <div className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-[0.85rem] leading-tight text-ink">
                    {s.label}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-plum/10">
                    <span
                      className="bar-fill block h-full rounded-full"
                      style={{
                        "--bar-w": `${(s.score / 5) * 100}%`,
                        animationDelay: `${i * 60}ms`,
                        backgroundColor: QUALITY_GROUPS[group].color,
                      } as React.CSSProperties}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right text-[0.8rem] font-medium tabular-nums text-ink-soft">
                    {s.score.toFixed(1)}
                  </span>
                </div>
                {s.reason ? (
                  <p
                    className={`mt-1.5 pl-1 text-[0.78rem] leading-snug ${
                      s.score <= 2.5 ? "text-clay" : "text-ink-soft"
                    }`}
                  >
                    {s.score <= 2.5 ? "What pulled this down: " : "What affected this: "}
                    {s.reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Bits */

function PhotoStrip({ photos }: { photos: string[] }) {
  if (!photos.length) {
    return (
      <Link
        href="/profile/edit"
        className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-plum/25 bg-paper/30 px-4 py-6 text-sm font-semibold text-plum transition hover:border-plum/45 active:scale-[0.99]"
      >
        <ImagePlus size={18} strokeWidth={2.2} />
        Add photos
      </Link>
    );
  }
  return (
    <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none]">
      {photos.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={url}
          alt={`Photo ${i + 1}`}
          className="h-44 w-36 shrink-0 rounded-[var(--radius-card)] object-cover shadow-[var(--shadow-soft)] transition duration-300 hover:scale-[1.03] active:scale-[0.99]"
        />
      ))}
    </div>
  );
}

function Card({ children, hover }: { children: React.ReactNode; hover?: boolean }) {
  return (
    <section
      className={`rounded-[var(--radius-card)] bg-paper/70 p-5 shadow-[var(--shadow-soft)] ${hover ? "card-hover" : ""}`}
    >
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-hover rounded-[var(--radius-card)] bg-paper/70 p-4 shadow-[var(--shadow-soft)]">
      <p className="pop-in font-display text-2xl font-light text-plum-deep">{value}</p>
      <p className="mt-0.5 text-[0.72rem] leading-tight text-ink-soft">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="truncate text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-ink/10 bg-paper/30 p-8 text-center text-sm text-ink-soft">
      {children}
    </div>
  );
}
