"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QUALITY_BY_KEY } from "@/lib/constants/qualities";

/**
 * A woman authors an open-ended behavioral question for men. She picks the
 * quality it measures and writes the scenario; men answer it in free text and
 * Claude scores the answer. RLS ("questions: women author") enforces women-only.
 */
export async function createQuestion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const qualityKey = String(formData.get("quality_key") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (!QUALITY_BY_KEY[qualityKey] || prompt.length < 8) {
    redirect("/questions?error=1");
  }

  await supabase.from("quiz_questions").insert({
    created_by: user.id,
    quality_key: qualityKey,
    prompt,
    options: [], // open-ended now; men answer in their own words
  });

  revalidatePath("/questions");
  redirect("/questions");
}

export async function deleteQuestion(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("quiz_questions").delete().eq("id", id);
  revalidatePath("/questions");
}
