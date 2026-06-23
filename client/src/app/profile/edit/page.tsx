import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { signPhotoUrls } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import { EditProfileForm } from "./EditProfileForm";

export default async function EditProfilePage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/gender");

  const supabase = await createClient();
  const urls = await signPhotoUrls(supabase, profile.photos);
  const initialPhotos = profile.photos.map((path, i) => ({ path, url: urls[i] ?? "" }));

  return <EditProfileForm profile={profile} initialPhotos={initialPhotos} />;
}
