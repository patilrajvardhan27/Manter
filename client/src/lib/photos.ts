import type { SupabaseClient } from "@supabase/supabase-js";

/** Private Storage bucket holding profile photos. Path: "<owner_id>/<filename>". */
export const PHOTO_BUCKET = "profile-photos";
export const MAX_PHOTOS = 3;

/**
 * Resolve storage paths to signed URLs (the bucket is private). Order is
 * preserved; any path the caller can't read (per Storage RLS) is dropped.
 * Works with both the server and browser Supabase clients.
 */
export async function signPhotoUrls(
  supabase: SupabaseClient,
  paths: string[] | null | undefined,
  expiresIn = 3600,
): Promise<string[]> {
  const clean = (paths ?? []).filter(Boolean);
  if (!clean.length) return [];
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(clean, expiresIn);
  return (data ?? [])
    .map((d) => d.signedUrl)
    .filter((u): u is string => Boolean(u));
}

/** Sign just the first photo (for cards/avatars), or null. */
export async function signFirstPhoto(
  supabase: SupabaseClient,
  paths: string[] | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  const [first] = await signPhotoUrls(supabase, (paths ?? []).slice(0, 1), expiresIn);
  return first ?? null;
}
