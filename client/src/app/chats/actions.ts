"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Unmatch: the woman removes a match she started. Deleting the match cascades to
 * its messages, so the conversation vanishes for both people. RLS ("matches:
 * woman deletes") guarantees only the woman who initiated can do this — we also
 * scope the delete to her id so a stray man_id can never be removed.
 */
export async function unmatch(matchId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("matches").delete().eq("id", matchId).eq("woman_id", user.id);

  redirect("/chats");
}
