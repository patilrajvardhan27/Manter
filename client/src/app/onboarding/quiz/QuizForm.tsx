"use client";

import { useState, useTransition } from "react";
import { AuthShell } from "@/components/AuthShell";
import type { SituationalQuestion } from "@/lib/constants/situational-quiz";
import { submitQuiz, type Answer } from "./actions";

/**
 * One-question-at-a-time situational quiz, answered by every profile
 * regardless of gender. Each pick is scored deterministically against the 23
 * qualities (see actions.ts) — no free text, no AI call needed for this step.
 */
export function QuizForm({ questions }: { questions: SituationalQuestion[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const q = questions[step];
  const total = questions.length;
  const isLast = step === total - 1;
  const selected = answers[q.id];
  const answeredCount = questions.filter((x) => answers[x.id]).length;

  function choose(optionId: string) {
    setAnswers((a) => ({ ...a, [q.id]: optionId }));
  }

  function next() {
    if (!selected) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    const payload: Answer[] = questions
      .filter((question) => answers[question.id])
      .map((question) => ({ questionId: question.id, optionId: answers[question.id] }));
    startTransition(() => {
      submitQuiz(payload);
    });
  }

  return (
    <AuthShell
      eyebrow={`Question ${step + 1} of ${total}`}
      title="The character quiz."
      subtitle="Real situations, no right answers — just how much you agree. This builds the score on your profile."
    >
      <div className="space-y-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-plum transition-all"
            style={{ width: `${(answeredCount / total) * 100}%` }}
          />
        </div>

        <p className="font-display text-lg leading-snug text-ink">{q.prompt}</p>

        <div className="space-y-2.5">
          {q.options.map((option) => {
            const active = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => choose(option.id)}
                aria-pressed={active}
                className={`w-full rounded-2xl border px-4 py-3.5 text-left text-[0.95rem] font-medium transition active:scale-[0.99] ${
                  active
                    ? "border-plum bg-plum text-cream shadow-[var(--shadow-soft)]"
                    : "border-ink/10 bg-paper/60 text-ink"
                }`}
              >
                {option.text}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={pending}
              className="flex h-14 items-center justify-center rounded-2xl border border-plum/20 px-5 text-base font-medium text-plum-deep transition active:scale-[0.98] disabled:opacity-40"
            >
              Back
            </button>
          ) : null}
          <button
            onClick={next}
            disabled={!selected || pending}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-plum text-base font-semibold text-cream shadow-[var(--shadow-soft)] transition hover:bg-plum-deep active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "Scoring your answers…" : isLast ? "Next: set your priorities" : "Next"}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
