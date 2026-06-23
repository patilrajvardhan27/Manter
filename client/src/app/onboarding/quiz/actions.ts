"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITUATIONAL_QUESTIONS } from "@/lib/constants/situational-quiz";
import { QUALITIES } from "@/lib/constants/qualities";

const NEUTRAL = 3;

export interface Answer {
  questionId: string;
  optionId: string;
}

/**
 * Persist a profile's situational quiz answers and derive their per-quality
 * character score deterministically from the picked option's effects —
 * identical mechanic for every gender. Every quality starts neutral (3);
 * qualities touched by one or more answered questions get the average of
 * those answers' scores instead.
 */
export async function submitQuiz(answers: Answer[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const byId = new Map(SITUATIONAL_QUESTIONS.map((q) => [q.id, q]));
  const resolved = answers.flatMap((a) => {
    const option = byId.get(a.questionId)?.options.find((o) => o.id === a.optionId);
    return option ? [{ questionId: a.questionId, option }] : [];
  });

  if (resolved.length) {
    await supabase.from("quiz_answers").upsert(
      resolved.map((r) => ({ profile_id: user.id, question_id: r.questionId, answer: r.option.text })),
      { onConflict: "profile_id,question_id" },
    );
  }

  const perQuality: Record<string, number[]> = {};
  for (const r of resolved) {
    for (const [key, delta] of Object.entries(r.option.effects)) {
      (perQuality[key] ??= []).push(Math.max(1, Math.min(5, NEUTRAL + delta)));
    }
  }

  const scores: Record<string, number> = {};
  QUALITIES.forEach((q) => {
    const values = perQuality[q.key];
    scores[q.key] = values?.length
      ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
      : NEUTRAL;
  });

  await supabase.from("quiz_scores").upsert(
    Object.entries(scores).map(([quality_key, score]) => ({
      profile_id: user.id,
      quality_key,
      score,
      reason: null,
    })),
    { onConflict: "profile_id,quality_key" },
  );

  redirect("/onboarding/priorities");
}
