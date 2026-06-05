import { redirect } from "next/navigation";
import { getMyProfile, type Role } from "@/lib/profile";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { profile } = await getMyProfile();
  if (profile) redirect("/home");

  const role = (await searchParams).role;
  if (role !== "woman" && role !== "man") redirect("/onboarding/role");

  return <ProfileForm role={role as Role} />;
}
