import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { WOMAN_QUIZ_QUESTIONS } from "@/lib/constants/woman-quiz";
import { PrioritiesQuizForm } from "./PrioritiesQuizForm";

export default async function PrioritiesQuizPage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/role");
  // This quiz is for women; men take the behavioral quiz instead.
  if (profile.role !== "woman") redirect("/home");

  return <PrioritiesQuizForm questions={WOMAN_QUIZ_QUESTIONS} />;
}
