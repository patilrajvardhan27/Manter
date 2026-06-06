import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { getActiveQuestions } from "@/lib/quiz-data";
import { QuizForm } from "./QuizForm";

export default async function QuizPage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/role");
  // The quiz is for men; women don't have a self-assessment.
  if (profile.role !== "man") redirect("/home");

  const questions = await getActiveQuestions();
  return <QuizForm questions={questions} />;
}
