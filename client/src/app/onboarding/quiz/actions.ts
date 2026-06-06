"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveQuestions } from "@/lib/quiz-data";
import { QUALITIES } from "@/lib/constants/qualities";

const FASTAPI = process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";

export interface Answer {
  questionId: string;
  answer: string;
}

/**
 * Persist a man's written quiz answers and derive his per-quality scores by
 * having Claude evaluate the free text (FastAPI /evaluate). RLS limits both
 * writes to his own rows. Onboarding never hard-fails: if evaluation is
 * unavailable, measured qualities fall back to neutral.
 */
export async function submitQuiz(answers: Answer[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const questions = await getActiveQuestions();
  const byId = new Map(questions.map((q) => [q.id, q]));

  const clean = answers
    .map((a) => ({ ...a, answer: a.answer.trim() }))
    .filter((a) => a.answer && byId.has(a.questionId));

  if (clean.length) {
    await supabase.from("quiz_answers").upsert(
      clean.map((a) => ({ man_id: user.id, question_id: a.questionId, answer: a.answer })),
      { onConflict: "man_id,question_id" },
    );
  }

  // Every quality starts neutral; Claude's scores override the ones it judged.
  const scores: Record<string, number> = {};
  QUALITIES.forEach((q) => (scores[q.key] = 3));

  const measured = new Set<string>();
  const evalPayload = clean.map((a) => {
    const q = byId.get(a.questionId)!;
    q.qualities.forEach((qr) => measured.add(qr.key));
    return { prompt: q.prompt, qualities: q.qualities, answer: a.answer };
  });

  try {
    const res = await fetch(`${FASTAPI}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: evalPayload }),
      cache: "no-store",
    });
    if (res.ok) {
      const { scores: judged } = (await res.json()) as { scores: Record<string, number> };
      for (const [key, value] of Object.entries(judged)) {
        if (key in scores) scores[key] = Math.max(1, Math.min(5, value));
      }
    }
  } catch {
    // leave measured qualities at neutral 3 if the evaluator is unreachable
    void measured;
  }

  await supabase.from("man_quiz_scores").upsert(
    Object.entries(scores).map(([quality_key, score]) => ({
      man_id: user.id,
      quality_key,
      score,
    })),
    { onConflict: "man_id,quality_key" },
  );

  redirect("/home");
}
