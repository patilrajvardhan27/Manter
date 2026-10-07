"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Delete everything the voice interview produced for the signed-in user:
 * sessions (turns cascade), voice scores, and the private voice profile.
 * Runs as the user, so RLS ("owner deletes") scopes it to their own rows.
 */
export async function deleteInterview(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  for (const table of ["voice_profiles", "voice_trait_scores", "voice_sessions"] as const) {
    const { error } = await supabase.from(table).delete().eq("profile_id", user.id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/home");
  revalidatePath("/onboarding/voice");
  return { ok: true };
}
