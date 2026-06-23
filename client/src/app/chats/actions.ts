"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Unmatch: whoever initiated the match removes it. Deleting the match cascades
 * to its messages, so the conversation vanishes for both people. RLS ("matches:
 * seeker deletes") guarantees only the seeker can do this — we also scope the
 * delete to their id so a stray target_id can never be removed.
 */
export async function unmatch(matchId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("matches").delete().eq("id", matchId).eq("seeker_id", user.id);

  redirect("/chats");
}
