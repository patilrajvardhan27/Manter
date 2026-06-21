"use client";

import { useState, useTransition } from "react";
import { AuthShell } from "@/components/AuthShell";
import type { WomanQuizQuestion } from "@/lib/constants/woman-quiz";
import { submitPriorities, type PriorityAnswer } from "./actions";

/**
 * Two quick situational questions, one option each, before she lands in
 * /home. Picking an option nudges her starting quality priorities — she can
 * still fine-tune everything afterward in Priorities.
 */
export function PrioritiesQuizForm({ questions }: { questions: WomanQuizQuestion[] }) {
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
    const payload: PriorityAnswer[] = questions
      .filter((question) => answers[question.id])
      .map((question) => ({ questionId: question.id, optionId: answers[question.id] }));
    startTransition(() => {
      submitPriorities(payload);
    });
  }

  return (
    <AuthShell
      eyebrow={`Question ${step + 1} of ${total}`}
      title="One more thing."
      subtitle="A couple of situations — pick what feels true to you. It just sets where your priorities start; you can adjust every quality later."
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
                className={`w-full rounded-2xl border px-4 py-3.5 text-left text-[0.95rem] leading-snug transition active:scale-[0.99] ${
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
            {pending ? "Saving…" : isLast ? "Finish setup" : "Next"}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
