"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Textarea } from "@/components/ui/Field";
import type { Question } from "@/lib/quiz-data";
import { submitQuiz, type Answer } from "./actions";

const MIN_CHARS = 15;

/**
 * One-question-at-a-time behavioral quiz. The man answers in his own words;
 * Claude scores the writing afterward. He can't skip, and answers need a little
 * substance before "Next" unlocks.
 */
export function QuizForm({ questions }: { questions: Question[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const q = questions[step];
  const total = questions.length;
  const isLast = step === total - 1;
  const value = answers[q.id] ?? "";
  const ready = value.trim().length >= MIN_CHARS;
  const answeredCount = questions.filter((x) => (answers[x.id] ?? "").trim().length >= MIN_CHARS).length;

  function next() {
    if (!ready) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    const payload: Answer[] = questions
      .filter((question) => (answers[question.id] ?? "").trim().length >= MIN_CHARS)
      .map((question) => ({ questionId: question.id, answer: answers[question.id] }));
    startTransition(() => {
      submitQuiz(payload);
    });
  }

  return (
    <AuthShell
      eyebrow={`Question ${step + 1} of ${total}`}
      title="The character quiz."
      subtitle="Answer in your own words — there are no right answers. Claude reads your responses to build your score; women see the score, not the raw text."
    >
      <div className="space-y-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-plum transition-all"
            style={{ width: `${(answeredCount / total) * 100}%` }}
          />
        </div>

        {q.custom ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-plum">
            <Sparkles size={13} strokeWidth={2.2} />
            A woman added this question
          </p>
        ) : null}

        <p className="font-display text-lg leading-snug text-ink">{q.prompt}</p>

        <Textarea
          value={value}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
          maxLength={600}
          rows={5}
          placeholder="Type your honest answer…"
          className="min-h-[140px]"
          autoFocus
        />
        <p className="-mt-2 text-right text-xs text-ink-soft/70">
          {value.trim().length < MIN_CHARS
            ? `${MIN_CHARS - value.trim().length} more characters`
            : `${value.trim().length}/600`}
        </p>

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
            disabled={!ready || pending}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-plum text-base font-semibold text-cream shadow-[var(--shadow-soft)] transition hover:bg-plum-deep active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "Scoring your answers…" : isLast ? "Finish & build my score" : "Next"}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
