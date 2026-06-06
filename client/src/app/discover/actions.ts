"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Woman-first contact: find-or-create the match with this man, then open the
 * chat. RLS ("matches: woman creates") guarantees only she can initiate.
 */
export async function startConversation(manId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("woman_id", user.id)
    .eq("man_id", manId)
    .maybeSingle();

  let matchId = existing?.id;
  if (!matchId) {
    const { data, error } = await supabase
      .from("matches")
      .insert({ woman_id: user.id, man_id: manId })
      .select("id")
      .single();
    if (error || !data) redirect("/discover");
    matchId = data.id;
  }

  redirect(`/chats/${matchId}`);
}
