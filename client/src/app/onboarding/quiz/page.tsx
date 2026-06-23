import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { SITUATIONAL_QUESTIONS } from "@/lib/constants/situational-quiz";
import { QuizForm } from "./QuizForm";

export default async function QuizPage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/gender");

  return <QuizForm questions={SITUATIONAL_QUESTIONS} />;
}
