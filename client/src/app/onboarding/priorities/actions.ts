"use server";

import { redirect } from "next/navigation";
import { saveWeights } from "@/app/home/actions";
import { WOMAN_QUIZ_QUESTIONS } from "@/lib/constants/woman-quiz";

export interface PriorityAnswer {
  questionId: string;
  optionId: string;
}

const NEUTRAL_WEIGHT = 3;

/**
 * Turn her picked options into starting priority weights: each quality the
 * picked options touch starts at neutral (3) and shifts by the option's
 * delta, clamped to 1–5. Qualities no question touched are left unset, so
 * the Priorities tab still defaults them to neutral.
 */
export async function submitPriorities(answers: PriorityAnswer[]) {
  const byId = new Map(WOMAN_QUIZ_QUESTIONS.map((q) => [q.id, q]));

  const deltas: Record<string, number> = {};
  for (const a of answers) {
    const question = byId.get(a.questionId);
    const option = question?.options.find((o) => o.id === a.optionId);
    if (!option) continue;
    for (const [key, delta] of Object.entries(option.effects)) {
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
