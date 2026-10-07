"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Answer an introduction. The respond_to_introduction RPC enforces the rules
 * (participant only, one answer per side, nothing after expiry) and its
 * trigger opens the match when both sides say interested.
 */
export async function respondToIntro(
  introId: string,
  decision: "interested" | "pass",
): Promise<{ ok: boolean; status?: string; matchId?: string | null; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_to_introduction", {
    p_intro: introId,
    p_decision: decision,
  });
  if (error) return { ok: false, error: "Couldn't save your answer. Try again." };
  revalidatePath("/intro");
  revalidatePath("/chats");
  const result = data as { status: string; match_id: string | null };
  return { ok: true, status: result.status, matchId: result.match_id };
}

/** "Would you meet them again?" after a match. The strongest learning signal. */
export async function sendIntroFeedback(introId: string, wouldMeetAgain: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_intro_feedback", {
    p_intro: introId,
    p_would_meet_again: wouldMeetAgain,
  });
  revalidatePath("/intro");
  return { ok: !error };
}
