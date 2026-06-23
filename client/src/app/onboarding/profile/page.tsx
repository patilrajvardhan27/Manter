import { redirect } from "next/navigation";
import { getMyProfile, type Gender } from "@/lib/profile";
import { ProfileForm } from "./ProfileForm";

const VALID_GENDERS: Gender[] = ["male", "female", "lgbtq"];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string; interestedIn?: string }>;
}) {
  const { profile } = await getMyProfile();
  if (profile) redirect("/home");

  const { gender, interestedIn } = await searchParams;
  if (!VALID_GENDERS.includes(gender as Gender)) redirect("/onboarding/gender");

  const interestedInList = (interestedIn ?? "")
    .split(",")
    .filter((g): g is Gender => VALID_GENDERS.includes(g as Gender));

  return <ProfileForm gender={gender as Gender} interestedIn={interestedInList} />;
}
