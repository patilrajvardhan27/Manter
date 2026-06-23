import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { PrioritiesForm } from "./PrioritiesForm";

export default async function PrioritiesPage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/gender");

  return <PrioritiesForm />;
}
