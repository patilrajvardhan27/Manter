"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { QUALITY_BY_KEY } from "@/lib/constants/qualities";

/**
 * Persist a woman's priority weights (1–5 per quality). RLS limits the write to
 * her own rows. Only valid quality keys and in-range weights are saved.
 */
export async function saveWeights(weights: { quality_key: string; weight: number }[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const rows = weights
    .filter((w) => QUALITY_BY_KEY[w.quality_key])
    .map((w) => ({
      woman_id: user.id,
      quality_key: w.quality_key,
      weight: Math.max(1, Math.min(5, Math.round(w.weight))),
    }));

  if (!rows.length) return { ok: false, error: "Nothing to save." };

  const { error } = await supabase
    .from("woman_weights")
    .upsert(rows, { onConflict: "woman_id,quality_key" });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/home");
  return { ok: true };
}
