"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LogOut, Compass, IdCard, SlidersHorizontal, SquarePen, Check, Pencil, ImagePlus } from "lucide-react";
import { VerifyBadge } from "@/components/VerifyBadge";
import { ProfileDetails } from "@/components/ProfileDetails";
import { saveWeights } from "@/app/home/actions";
import type { Profile } from "@/lib/profile";
import type { QualityWeight } from "@/lib/quiz-data";
import {
  QUALITIES,
  QUALITY_GROUPS,
  type QualityGroup,
} from "@/lib/constants/qualities";

export interface MyQuestion {
  id: string;
  prompt: string;
  qualityLabel: string | null;
  active: boolean;
}

type Tab = "profile" | "priorities" | "questions";

const TABS: { id: Tab; label: string; icon: typeof IdCard }[] = [
  { id: "profile", label: "Profile", icon: IdCard },
  { id: "priorities", label: "Priorities", icon: SlidersHorizontal },
  { id: "questions", label: "Questions", icon: SquarePen },
];

export function WomanProfile({
  profile,
  weights,
  questions,
  photos,
}: {
  profile: Profile;
  weights: QualityWeight[];
  questions: MyQuestion[];
  photos: string[];
}) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between rise" style={{ animationDelay: "0ms" }}>
        <span className="font-display text-2xl font-semibold tracking-tight text-plum-deep">
          Manter
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
          <ProfilePanel
            profile={profile}
            weights={weights}
            questions={questions}
            photos={photos}
          />
        )}
        {tab === "priorities" && <PrioritiesPanel weights={weights} />}
        {tab === "questions" && <QuestionsPanel questions={questions} />}
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- Profile tab */

function ProfilePanel({
  profile,
  weights,
  questions,
  photos,
}: {
  profile: Profile;
  weights: QualityWeight[];
  questions: MyQuestion[];
  photos: string[];
}) {
  const topCount = weights.filter((w) => w.weight >= 4).length;

  return (
    <div className="space-y-4">
      <PhotoStrip photos={photos} />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Top priorities (4–5)" value={String(topCount)} />
        <Stat label="Questions authored" value={String(questions.length)} />
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
        href="/discover"
        className="group flex items-center justify-between rounded-[var(--radius-card)] border border-plum/15 bg-paper/30 p-5 transition hover:border-plum/30 active:scale-[0.99]"
      >
        <span>
          <span className="block font-display text-base font-medium text-ink">
            Discover your matches
          </span>
          <span className="mt-0.5 block text-[0.85rem] text-ink-soft">
            Men ranked by the qualities that matter to you.
          </span>
        </span>
        <Compass size={20} strokeWidth={2} className="shrink-0 text-plum" />
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------- Priorities tab */

const DEFAULT_WEIGHT = 3;
const TIERS = ["", "Optional", "Minor", "Matters", "Important", "Essential"];

function PrioritiesPanel({ weights }: { weights: QualityWeight[] }) {
  // Start from every quality (default neutral) so she can rate any of the 23,
  // then overlay whatever she's already set.
  const initial = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of QUALITIES) map[q.key] = DEFAULT_WEIGHT;
    for (const w of weights) map[w.key] = w.weight;
    return map;
  }, [weights]);

  const [values, setValues] = useState<Record<string, number>>(initial);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(
    () => QUALITIES.some((q) => values[q.key] !== initial[q.key]),
    [values, initial],
  );

  // Auto-dismiss the "Saved" confirmation.
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 1800);
    return () => clearTimeout(t);
  }, [justSaved]);

  function set(key: string, weight: number) {
    setValues((v) => ({ ...v, [key]: weight }));
    setJustSaved(false);
    setError(null);
  }

  function onSave() {
    startTransition(async () => {
      const res = await saveWeights(
        QUALITIES.map((q) => ({ quality_key: q.key, weight: values[q.key] })),
      );
      if (res.ok) {
        setJustSaved(true);
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  // Group by the 5 quality groups for a scannable mobile layout.
  const groups = new Map<QualityGroup, typeof QUALITIES>();
  for (const q of QUALITIES) {
    const bucket = groups.get(q.group) ?? [];
    bucket.push(q);
    groups.set(q.group, bucket);
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="rounded-[var(--radius-card)] bg-paper/60 px-4 py-3">
        <p className="text-[0.82rem] leading-relaxed text-ink-soft">
          Set how much each quality matters — this shapes who you see in Discover.
        </p>
        <div className="mt-2.5 flex items-center justify-between text-[0.62rem] font-semibold uppercase tracking-wide text-ink-soft/70">
          <span>Optional</span>
          <span className="h-px flex-1 mx-2 bg-ink/10" />
          <span>Essential</span>
        </div>
      </div>

      {[...groups.entries()].map(([group, items]) => {
        const color = QUALITY_GROUPS[group].color;
        const essential = items.filter((q) => values[q.key] >= 4).length;
        return (
          <Card key={group}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {QUALITY_GROUPS[group].label}
              </h2>
              <span className="text-[0.68rem] font-medium text-ink-soft/70">
                {essential}/{items.length} key
              </span>
            </div>

            <ul className="mt-3.5 space-y-4">
              {items.map((q) => {
                const value = values[q.key];
                return (
                  <li key={q.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.9rem] font-medium leading-tight text-ink">
                        {q.label}
                      </span>
                      <span
                        className="shrink-0 text-[0.72rem] font-semibold"
                        style={{ color: value >= 4 ? color : "var(--color-ink-soft)" }}
                      >
                        {TIERS[value]}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => {
                        const on = n <= value;
                        const current = n === value;
                        return (
                          <button
                            key={n}
                            type="button"
                            aria-label={`${q.label}: ${n} (${TIERS[n]})`}
                            aria-pressed={current}
                            onClick={() => set(q.key, n)}
                            className={`h-8 flex-1 rounded-lg text-[0.72rem] font-semibold transition-all active:scale-95 ${
                              current ? "ring-2 ring-offset-1 ring-offset-paper" : ""
                            }`}
                            style={{
                              backgroundColor: on
                                ? color
                                : "color-mix(in srgb, var(--color-ink) 6%, transparent)",
                              color: on ? "var(--color-cream)" : "var(--color-ink-soft)",
                              ["--tw-ring-color" as string]: color,
                            }}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      {error ? (
        <p className="rounded-xl bg-redflag/10 px-4 py-2.5 text-sm text-redflag">{error}</p>
      ) : null}

      {/* Save sits at the end of the list, in normal flow. */}
      <button
        type="button"
        onClick={onSave}
        disabled={pending || (!dirty && !justSaved)}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-plum px-6 py-3 text-sm font-semibold text-cream shadow-[var(--shadow-soft)] transition active:scale-[0.99] disabled:opacity-50"
      >
        {pending ? (
          "Saving…"
        ) : justSaved && !dirty ? (
          <>
            <Check size={16} strokeWidth={2.4} /> Saved
          </>
        ) : (
          "Save changes"
        )}
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- Questions tab */

function QuestionsPanel({ questions }: { questions: MyQuestion[] }) {
  return (
    <div className="space-y-3">
      <Link
        href="/questions"
        className="flex items-center justify-center gap-1.5 rounded-full bg-plum px-4 py-2.5 text-xs font-semibold text-cream transition active:scale-[0.99]"
      >
        <SquarePen size={15} strokeWidth={2.2} />
        Manage your questions
      </Link>

      {!questions.length ? (
        <Empty>You haven&apos;t written any questions yet.</Empty>
      ) : (
        questions.map((q) => (
          <Card key={q.id}>
            <div className="flex items-start justify-between gap-3">
              {q.qualityLabel ? (
                <span className="rounded-full bg-plum/10 px-2.5 py-0.5 text-[0.7rem] font-semibold text-plum">
                  {q.qualityLabel}
                </span>
              ) : (
                <span />
              )}
              {!q.active ? (
                <span className="text-[0.7rem] font-medium text-ink-soft/70">Inactive</span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-snug text-ink">{q.prompt}</p>
          </Card>
        ))
      )}
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
          className="h-44 w-36 shrink-0 rounded-[var(--radius-card)] object-cover shadow-[var(--shadow-soft)]"
        />
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-paper/70 p-5 shadow-[var(--shadow-soft)]">
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-paper/70 p-4 shadow-[var(--shadow-soft)]">
      <p className="font-display text-2xl font-light text-plum-deep">{value}</p>
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
