"use client";

import { useState } from "react";
import { IdCard, MessageSquareQuote, BarChart3 } from "lucide-react";
import type { AnsweredQuestion } from "@/lib/quiz-data";
import type { QualityDetail } from "@/lib/match";
import { QUALITY_GROUPS, type QualityGroup } from "@/lib/constants/qualities";

type Tab = "profile" | "answers" | "compatibility";

const TABS: { id: Tab; label: string; icon: typeof IdCard }[] = [
  { id: "profile", label: "Profile", icon: IdCard },
  { id: "answers", label: "Answers", icon: MessageSquareQuote },
  { id: "compatibility", label: "Match", icon: BarChart3 },
];

const GROUP_ORDER: QualityGroup[] = [
  "respect",
  "emotional-maturity",
  "safety",
  "partnership",
  "character",
];

/** Tiny dot row — `value` (0-5, rounded) of them filled, each popping in in sequence. */
function Dots({ value, color }: { value: number; color: string }) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex gap-[2px]" aria-label={`${filled} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="pop-in h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: n <= filled ? color : "color-mix(in srgb, var(--color-ink) 12%, transparent)",
            animationDelay: `${n * 35}ms`,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Segmented tabs for a candidate's detail page (Profile / Answers / Match).
 * Keeps the page short on mobile by showing one panel at a time instead of
 * one long scroll of photos + score + 23 quality cards + answers.
 */
export function ManDetailTabs({
  profilePanel,
  answers,
  qualities,
}: {
  profilePanel: React.ReactNode;
  answers: AnsweredQuestion[];
  qualities: QualityDetail[];
}) {
  const [tab, setTab] = useState<Tab>("profile");

  const byGroup = GROUP_ORDER.map((g) => ({
    group: g,
    meta: QUALITY_GROUPS[g],
    items: qualities.filter((q) => q.group === g),
  })).filter((s) => s.items.length > 0);

  return (
    <>
      <div className="mt-5 flex gap-1 rounded-full bg-paper/70 p-1">
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

      <div key={tab} className="mt-4 rise" style={{ animationDelay: "0ms" }}>
        {tab === "profile" && profilePanel}
        {tab === "answers" && <AnswersPanel answers={answers} />}
        {tab === "compatibility" && <CompatibilityPanel byGroup={byGroup} />}
      </div>
    </>
  );
}

function AnswersPanel({ answers }: { answers: AnsweredQuestion[] }) {
  if (!answers.length) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-ink/10 bg-paper/30 p-8 text-center text-sm text-ink-soft">
        They haven&apos;t answered the quiz yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {answers.map((a, i) => (
        <div key={a.questionId} className="card-hover rounded-2xl bg-paper/60 p-3.5 shadow-[var(--shadow-soft)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-plum">
            Question {i + 1}
          </p>
          <p className="mt-1 text-sm font-medium leading-snug text-ink">{a.prompt}</p>
          <p className="mt-2 border-l-2 border-plum/25 pl-2.5 text-[0.88rem] leading-relaxed text-ink-soft">
            {a.answer}
          </p>
        </div>
      ))}
    </div>
  );
}

function CompatibilityPanel({
  byGroup,
}: {
  byGroup: { group: QualityGroup; meta: { label: string; color: string }; items: QualityDetail[] }[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-[0.78rem] text-ink-soft">
        <span className="font-medium text-plum">●</span> their self-assessment ·{" "}
        <span className="font-medium text-ink-soft">●</span> your priority
      </p>
      {byGroup.map((sec) => (
        <div key={sec.group} className="card-hover rounded-2xl bg-paper/60 p-3.5 shadow-[var(--shadow-soft)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: sec.meta.color }}>
            {sec.meta.label}
          </p>
          <div className="mt-1.5 divide-y divide-ink/5">
            {sec.items.map((q) => (
              <div key={q.key} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[0.82rem] text-ink">{q.label}</span>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Dots value={q.candidateScore} color="var(--color-plum)" />
                  <Dots value={q.weight} color="color-mix(in srgb, var(--color-ink) 45%, transparent)" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
