"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveWeights } from "@/app/home/actions";
import { WOMAN_QUIZ_QUESTIONS } from "@/lib/constants/woman-quiz";

export interface PriorityAnswer {
  questionId: string;
  optionId: string;
}

const NEUTRAL_WEIGHT = 3;

/**
 * Persist her picked options as answers (same as a man's quiz answers, so a
 * matched man can read them), and turn them into starting priority weights:
 * each quality the picked options touch starts at neutral (3) and shifts by
 * the option's delta, clamped to 1–5. Qualities no question touched are left
 * unset, so the Priorities tab still defaults them to neutral.
 */
export async function submitPriorities(answers: PriorityAnswer[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const byId = new Map(WOMAN_QUIZ_QUESTIONS.map((q) => [q.id, q]));
  const resolved = answers.flatMap((a) => {
    const option = byId.get(a.questionId)?.options.find((o) => o.id === a.optionId);
    return option ? [{ questionId: a.questionId, option }] : [];
  });

  if (resolved.length) {
    await supabase.from("woman_quiz_answers").upsert(
      resolved.map((r) => ({ woman_id: user.id, question_id: r.questionId, answer: r.option.text })),
      { onConflict: "woman_id,question_id" },
    );
  }

  const deltas: Record<string, number> = {};
  for (const r of resolved) {
    for (const [key, delta] of Object.entries(r.option.effects)) {
      deltas[key] = (deltas[key] ?? 0) + delta;
    }
  }

  const weights = Object.entries(deltas).map(([quality_key, delta]) => ({
    quality_key,
    weight: Math.max(1, Math.min(5, NEUTRAL_WEIGHT + delta)),
  }));

  if (weights.length) {
    await saveWeights(weights);
  }

  redirect("/home");
}
