"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Find-or-create the match with this profile, then open the chat. RLS
 * ("matches: seeker creates") guarantees only the viewer can initiate as
 * seeker — symmetric regardless of gender.
 */
export async function startConversation(targetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("seeker_id", user.id)
    .eq("target_id", targetId)
    .maybeSingle();

  let matchId = existing?.id;
  if (!matchId) {
    const { data, error } = await supabase
      .from("matches")
      .insert({ seeker_id: user.id, target_id: targetId })
      .select("id")
      .single();
    if (error || !data) redirect("/discover");
    matchId = data.id;
  }

  redirect(`/chats/${matchId}`);
}
