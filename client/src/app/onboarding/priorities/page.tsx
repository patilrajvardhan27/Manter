import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { PrioritiesForm } from "./PrioritiesForm";

export default async function PrioritiesPage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/gender");

  // Start from what the voice interview heard, if there was one.
  const supabase = await createClient();
  const { data } = await supabase
    .from("voice_profiles")
    .select("partner_priorities")
    .eq("profile_id", userId)
    .maybeSingle();
  const initial: Record<string, number> = {};
  for (const p of (data?.partner_priorities as { quality_key: string; weight: number }[] | null) ?? []) {
    initial[p.quality_key] = p.weight;
  }

  return <PrioritiesForm initial={initial} />;
}
