"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveQuestions } from "@/lib/quiz-data";
import { QUALITIES } from "@/lib/constants/qualities";
import { QUIZ_QUESTIONS } from "@/lib/constants/quiz";

const FASTAPI = process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";
const NEUTRAL = 3;

export interface Answer {
  questionId: string;
  answer: string;
}

/**
 * Persist a man's quiz answers and derive his per-quality scores. Free-text
 * answers are judged by Claude (FastAPI /evaluate); likert answers are
 * scored deterministically from the picked option's effects. When both kinds
 * touch the same quality, their scores are averaged. RLS limits both writes
 * to his own rows. Onboarding never hard-fails: if evaluation is
 * unavailable, freetext-only qualities fall back to neutral.
 */
export async function submitQuiz(answers: Answer[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const questions = await getActiveQuestions();
  const byId = new Map(questions.map((q) => [q.id, q]));
  const defaultById = new Map(QUIZ_QUESTIONS.map((q) => [q.id, q]));

  const clean = answers
    .map((a) => ({ ...a, answer: a.answer.trim() }))
    .filter((a) => a.answer && byId.has(a.questionId));

  if (clean.length) {
    await supabase.from("quiz_answers").upsert(
      clean.map((a) => {
        const def = defaultById.get(a.questionId);
        // Likert answers carry an option id; store its label for readability.
        const answer =
          def?.kind === "likert"
            ? def.options.find((o) => o.id === a.answer)?.text ?? a.answer
            : a.answer;
        return { man_id: user.id, question_id: a.questionId, answer };
      }),
      { onConflict: "man_id,question_id" },
    );
  }

  const freetextClean = clean.filter((a) => defaultById.get(a.questionId)?.kind !== "likert");
  const likertClean = clean.filter((a) => defaultById.get(a.questionId)?.kind === "likert");

  // Collect every score that touches a quality, then average per quality.
  const perQuality: Record<string, number[]> = {};
  const reasons: Record<string, string | null> = {};

  for (const a of likertClean) {
    const def = defaultById.get(a.questionId)!;
    const option = def.options.find((o) => o.id === a.answer);
    if (!option) continue;
    for (const [key, delta] of Object.entries(option.effects)) {
      (perQuality[key] ??= []).push(Math.max(1, Math.min(5, NEUTRAL + delta)));
    }
  }

  const evalPayload = freetextClean.map((a) => {
    const q = byId.get(a.questionId)!;
    return { prompt: q.prompt, qualities: q.qualities, answer: a.answer };
  });

  if (evalPayload.length) {
    try {
      const res = await fetch(`${FASTAPI}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: evalPayload }),
        cache: "no-store",
      });
      if (res.ok) {
        const { scores: judged } = (await res.json()) as {
          scores: Record<string, { score: number; reason: string }>;
        };
        for (const [key, value] of Object.entries(judged)) {
          (perQuality[key] ??= []).push(Math.max(1, Math.min(5, value.score)));
          reasons[key] = value.reason || null;
        }
      }
    } catch {
      // leave freetext-only qualities at neutral if the evaluator is unreachable
    }
  }

  // Every quality starts neutral; qualities any source touched get averaged in.
  const scores: Record<string, number> = {};
  QUALITIES.forEach((q) => {
    const values = perQuality[q.key];
    scores[q.key] = values?.length
      ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
      : NEUTRAL;
  });

  await supabase.from("man_quiz_scores").upsert(
    Object.entries(scores).map(([quality_key, score]) => ({
      man_id: user.id,
      quality_key,
      score,
      reason: reasons[quality_key] ?? null,
    })),
    { onConflict: "man_id,quality_key" },
  );

  redirect("/home");
}
