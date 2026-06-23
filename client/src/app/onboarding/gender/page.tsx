import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { GenderChooser } from "./GenderChooser";

export default async function GenderPage() {
  const { profile } = await getMyProfile();
  // Already onboarded — gender is immutable, send them home.
  if (profile) redirect("/home");

  return <GenderChooser />;
}
